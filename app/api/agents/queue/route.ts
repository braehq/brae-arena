import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import vm from 'vm'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { agentId } = await request.json()
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 })

  const service = createServiceClient()

  const { data: agent } = await service.from('arena_agents').select('id, user_id, agent_elo, active').eq('id', agentId).single()
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  if (agent.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!agent.active) return NextResponse.json({ error: 'Agent is inactive' }, { status: 400 })

  // Upsert into queue
  await service.from('arena_agent_queue').upsert(
    { agent_id: agentId, elo: agent.agent_elo, status: 'waiting', joined_at: new Date().toISOString() },
    { onConflict: 'agent_id' }
  )

  // Attempt matchmaking immediately
  await attemptAgentMatchmaking(service, agentId, agent.agent_elo)

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { agentId } = await request.json()
  const service = createServiceClient()
  await service.from('arena_agent_queue').update({ status: 'cancelled' }).eq('agent_id', agentId).eq('status', 'waiting')
  return NextResponse.json({ ok: true })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function attemptAgentMatchmaking(service: any, agentId: string, elo: number) {
  const eloRange = 300

  const { data: opponents } = await service
    .from('arena_agent_queue')
    .select('*')
    .eq('status', 'waiting')
    .neq('agent_id', agentId)
    .gte('elo', elo - eloRange)
    .lte('elo', elo + eloRange)
    .order('joined_at', { ascending: true })
    .limit(1)

  if (!opponents || opponents.length === 0) return
  const opponent = opponents[0]

  // Pick a random active code_duel challenge
  const { data: challenges } = await service
    .from('arena_challenges')
    .select('id, title, description, starter_code, language, test_cases')
    .eq('active', true)
    .eq('challenge_type', 'code_duel')

  if (!challenges || challenges.length === 0) return
  const challenge = challenges[Math.floor(Math.random() * challenges.length)]

  // Create the match
  const { data: match, error } = await service.from('arena_agent_matches').insert({
    challenge_id: challenge.id,
    agent_one_id: agentId,
    agent_two_id: opponent.agent_id,
    status: 'running',
  }).select('id').single()

  if (error || !match) return

  // Update queue entries
  await service.from('arena_agent_queue')
    .update({ status: 'matched' })
    .in('agent_id', [agentId, opponent.agent_id])

  // Run both agents asynchronously (fire-and-forget)
  runAgentMatch(service, match.id, agentId, opponent.agent_id, challenge).catch(console.error)
}

type TestCase = { label: string; input: string; expected: string }
type TestResult = { label: string; passed: boolean; output: string; expected: string; error?: string }

function extractFunctionName(code: string): string {
  const match = code.match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:function|\())/i)
  return match?.[1] ?? match?.[2] ?? 'solution'
}

function runTestsServerSide(code: string, testCases: TestCase[]): TestResult[] {
  const fnName = extractFunctionName(code)
  return testCases.map(tc => {
    try {
      const sandbox = { result: undefined as unknown }
      new vm.Script(`${code}\nresult = JSON.stringify(${fnName}(${tc.input}));`)
        .runInContext(vm.createContext(sandbox), { timeout: 2000 })
      const output = String(sandbox.result)
      let passed = false
      try { passed = JSON.stringify(JSON.parse(output)) === JSON.stringify(JSON.parse(tc.expected)) }
      catch { passed = output === tc.expected }
      return { label: tc.label, passed, output, expected: tc.expected }
    } catch (err) {
      return { label: tc.label, passed: false, output: '', expected: tc.expected, error: String(err) }
    }
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runAgentMatch(service: any, matchId: string, agentOneId: string, agentTwoId: string, challenge: any) {
  const [{ data: agentOne }, { data: agentTwo }] = await Promise.all([
    service.from('arena_agents').select('agent_code, agent_elo, matches_played').eq('id', agentOneId).single(),
    service.from('arena_agents').select('agent_code, agent_elo, matches_played').eq('id', agentTwoId).single(),
  ])

  if (!agentOne || !agentTwo) {
    await service.from('arena_agent_matches').update({ status: 'failed' }).eq('id', matchId)
    return
  }

  const challengePayload = {
    title: challenge.title,
    description: challenge.description,
    language: challenge.language ?? 'javascript',
    starter_code: challenge.starter_code ?? '',
    test_cases: challenge.test_cases ?? [],
  }

  // Run each agent function in vm sandbox
  function runAgent(agentCode: string): { code: string; ms: number } {
    const start = Date.now()
    try {
      const sandbox = { challenge: challengePayload, result: undefined as unknown }
      new vm.Script(`${agentCode}\nresult = agent(challenge);`)
        .runInContext(vm.createContext(sandbox), { timeout: 10000 })
      return { code: String(sandbox.result ?? ''), ms: Date.now() - start }
    } catch {
      return { code: challenge.starter_code ?? '', ms: Date.now() - start }
    }
  }

  const [r1, r2] = await Promise.all([
    Promise.resolve(runAgent(agentOne.agent_code)),
    Promise.resolve(runAgent(agentTwo.agent_code)),
  ])

  // Score both
  const testCases: TestCase[] = challenge.test_cases ?? []
  const t1 = runTestsServerSide(r1.code, testCases)
  const t2 = runTestsServerSide(r2.code, testCases)
  const p1 = t1.filter(t => t.passed).length
  const p2 = t2.filter(t => t.passed).length
  const total = testCases.length

  const score1 = total > 0 ? Math.round((p1 / total) * 80) + (p1 === total ? Math.floor((1 - r1.ms / 10000) * 20) : 0) : 0
  const score2 = total > 0 ? Math.round((p2 / total) * 80) + (p2 === total ? Math.floor((1 - r2.ms / 10000) * 20) : 0) : 0

  const winnerId = score1 > score2 ? agentOneId : score2 > score1 ? agentTwoId : null

  // ELO
  const K = agentOne.matches_played < 30 ? 32 : agentOne.matches_played < 100 ? 24 : 16
  const expected1 = 1 / (1 + Math.pow(10, (agentTwo.agent_elo - agentOne.agent_elo) / 400))
  const s1 = winnerId === agentOneId ? 1 : winnerId == null ? 0.5 : 0
  const change1 = Math.round(K * (s1 - expected1))
  const change2 = -change1

  await service.from('arena_agent_matches').update({
    status: 'complete',
    agent_one_code: r1.code,
    agent_two_code: r2.code,
    agent_one_score: score1,
    agent_two_score: score2,
    agent_one_tests_passed: p1,
    agent_two_tests_passed: p2,
    agent_one_ms: r1.ms,
    agent_two_ms: r2.ms,
    winner_agent_id: winnerId,
    elo_change_one: change1,
    elo_change_two: change2,
  }).eq('id', matchId)

  await Promise.all([
    service.from('arena_agents').update({
      agent_elo: agentOne.agent_elo + change1,
      wins: agentOne.wins + (winnerId === agentOneId ? 1 : 0),
      losses: agentOne.losses + (winnerId === agentTwoId ? 1 : 0),
      matches_played: agentOne.matches_played + 1,
    }).eq('id', agentOneId),
    service.from('arena_agents').update({
      agent_elo: agentTwo.agent_elo + change2,
      wins: agentTwo.wins + (winnerId === agentTwoId ? 1 : 0),
      losses: agentTwo.losses + (winnerId === agentOneId ? 1 : 0),
      matches_played: agentTwo.matches_played + 1,
    }).eq('id', agentTwoId),
  ])
}
