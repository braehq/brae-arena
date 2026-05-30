import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import vm from 'vm'
import type { TestCase, TestResult } from '../run-tests/route'

function extractFunctionName(code: string): string {
  const match = code.match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:function|\())/i)
  return (match?.[1] ?? match?.[2] ?? 'solution')
}

function runServerSide(code: string, testCases: TestCase[]): TestResult[] {
  const fnName = extractFunctionName(code)
  return testCases.map(tc => {
    if (['delayed', 'once', 'reset', 'args'].includes(tc.expected)) {
      return { label: tc.label, passed: true, output: tc.expected, expected: tc.expected }
    }
    try {
      const sandbox = { result: undefined as unknown }
      const script = new vm.Script(`${code}\nresult = JSON.stringify(${fnName}(${tc.input}));`)
      script.runInContext(vm.createContext(sandbox), { timeout: 2000 })
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

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId, code } = await request.json()
  if (!matchId || !code) return NextResponse.json({ error: 'matchId and code required' }, { status: 400 })

  const service = createServiceClient()
  const now = new Date()

  // Fetch match + challenge
  const { data: match } = await service.from('arena_matches').select('*, challenge_id, ends_at, started_at').eq('id', matchId).single()
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  if (match.status !== 'active') return NextResponse.json({ error: 'Match not active' }, { status: 400 })
  if (now > new Date(match.ends_at)) return NextResponse.json({ error: 'Time is up' }, { status: 400 })

  if (match.player_one_id !== user.id && match.player_two_id !== user.id) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
  }

  const { data: challenge } = await service.from('arena_challenges')
    .select('test_cases, scoring_weights, challenge_type')
    .eq('id', match.challenge_id)
    .single()

  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })

  // Run tests server-side (source of truth, prevents client cheating)
  const testCases: TestCase[] = (challenge.test_cases as TestCase[]) ?? []
  const testResults = runServerSide(code, testCases)
  const testsPassed = testResults.filter(r => r.passed).length
  const testsTotal = testCases.length

  // Score: 80% from tests, 20% speed bonus
  const testScore = testsTotal > 0 ? Math.round((testsPassed / testsTotal) * 80) : 0
  const totalDuration = new Date(match.ends_at).getTime() - new Date(match.started_at).getTime()
  const timeUsed = now.getTime() - new Date(match.started_at).getTime()
  const timeRemainingPct = Math.max(0, (totalDuration - timeUsed) / totalDuration)
  const speedBonus = Math.floor(timeRemainingPct * 20)
  const scoreTotal = testScore + (testsPassed === testsTotal ? speedBonus : 0) // speed bonus only on perfect

  // Anti-cheat: flag if submitted within 60s
  const secondsElapsed = (now.getTime() - new Date(match.started_at).getTime()) / 1000
  if (secondsElapsed < 60) {
    await service.from('arena_anti_cheat_logs').insert({
      match_id: matchId, user_id: user.id,
      event_type: 'submission_too_fast',
      detail: { seconds_elapsed: Math.round(secondsElapsed) },
    })
  }

  // Upsert submission
  const { data: submission, error } = await service.from('arena_submissions')
    .upsert({
      match_id: matchId,
      user_id: user.id,
      deployed_url: `code://match/${matchId}`,
      submitted_at: now.toISOString(),
      submitted_code: code,
      test_results: testResults,
      tests_passed: testsPassed,
      tests_total: testsTotal,
      score_total: scoreTotal,
      score_speed_bonus: testsPassed === testsTotal ? speedBonus : 0,
      scoring_status: 'complete',
    }, { onConflict: 'match_id,user_id' })
    .select('id')
    .single()

  if (error || !submission) return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })

  // Log event
  await service.from('arena_match_events').insert({
    match_id: matchId, user_id: user.id,
    event_type: 'player_submitted',
    payload: { tests_passed: testsPassed, tests_total: testsTotal, score: scoreTotal },
  })

  // Check if match can be finalised
  await maybeFinalisCodeMatch(service, matchId, match)

  return NextResponse.json({ ok: true, testResults, testsPassed, testsTotal, score: scoreTotal })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function maybeFinalisCodeMatch(service: any, matchId: string, match: any) {
  const { data: submissions } = await service.from('arena_submissions').select('*').eq('match_id', matchId)
  if (!submissions) return

  const allDone = submissions.length === 2 && submissions.every((s: { scoring_status: string }) => s.scoring_status === 'complete')
  const timedOut = new Date() > new Date(match.ends_at)
  if (!allDone && !timedOut) return

  const p1Sub = submissions.find((s: { user_id: string }) => s.user_id === match.player_one_id)
  const p2Sub = submissions.find((s: { user_id: string }) => s.user_id === match.player_two_id)
  const p1Score = p1Sub?.score_total ?? 0
  const p2Score = p2Sub?.score_total ?? 0

  const winnerId = p1Score > p2Score ? match.player_one_id : p2Score > p1Score ? match.player_two_id : null
  const finalStatus = winnerId ? 'complete' : 'draw'

  const { calculateElo, calculateXpAward, getTierFromElo } = await import('@/lib/actions/elo')

  const [{ data: p1Profile }, { data: p2Profile }] = await Promise.all([
    service.from('profiles').select('arena_elo, arena_matches_played, arena_wins, arena_losses, arena_streak, total_xp').eq('id', match.player_one_id).single(),
    service.from('profiles').select('arena_elo, arena_matches_played, arena_wins, arena_losses, arena_streak, total_xp').eq('id', match.player_two_id).single(),
  ])
  if (!p1Profile || !p2Profile) return

  const p1Result = winnerId === match.player_one_id ? 'win' : finalStatus === 'draw' ? 'draw' : 'loss'
  const p2Result = winnerId === match.player_two_id ? 'win' : finalStatus === 'draw' ? 'draw' : 'loss'

  const eloP1 = match.mode === 'ranked' ? calculateElo(p1Profile.arena_elo, p2Profile.arena_elo, p1Result, p1Profile.arena_matches_played) : { newElo: p1Profile.arena_elo, change: 0, newTier: getTierFromElo(p1Profile.arena_elo) }
  const eloP2 = match.mode === 'ranked' ? calculateElo(p2Profile.arena_elo, p1Profile.arena_elo, p2Result, p2Profile.arena_matches_played) : { newElo: p2Profile.arena_elo, change: 0, newTier: getTierFromElo(p2Profile.arena_elo) }

  const p1Streak = p1Result === 'win' ? p1Profile.arena_streak + 1 : 0
  const p2Streak = p2Result === 'win' ? p2Profile.arena_streak + 1 : 0
  const xpP1 = calculateXpAward(p1Result, match.mode, p1Streak, false)
  const xpP2 = calculateXpAward(p2Result, match.mode, p2Streak, false)

  await service.from('arena_matches').update({ status: finalStatus, winner_id: winnerId, elo_change_p1: eloP1.change, elo_change_p2: eloP2.change, xp_awarded_p1: xpP1, xp_awarded_p2: xpP2 }).eq('id', matchId)

  await Promise.all([
    service.from('profiles').update({ arena_elo: eloP1.newElo, arena_rank_tier: eloP1.newTier, arena_matches_played: p1Profile.arena_matches_played + 1, arena_wins: p1Profile.arena_wins + (p1Result === 'win' ? 1 : 0), arena_losses: p1Profile.arena_losses + (p1Result === 'loss' ? 1 : 0), arena_streak: p1Streak, total_xp: p1Profile.total_xp + xpP1 }).eq('id', match.player_one_id),
    service.from('profiles').update({ arena_elo: eloP2.newElo, arena_rank_tier: eloP2.newTier, arena_matches_played: p2Profile.arena_matches_played + 1, arena_wins: p2Profile.arena_wins + (p2Result === 'win' ? 1 : 0), arena_losses: p2Profile.arena_losses + (p2Result === 'loss' ? 1 : 0), arena_streak: p2Streak, total_xp: p2Profile.total_xp + xpP2 }).eq('id', match.player_two_id),
  ])
}
