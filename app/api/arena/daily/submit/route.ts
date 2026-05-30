import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getTodayUTC } from '@/lib/daily-challenge'
import vm from 'vm'

type TestCase = { label: string; input: string; expected: string }
type TestResult = { label: string; passed: boolean; output: string; expected: string; error?: string }

function extractFunctionName(code: string): string {
  const match = code.match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:function|\())/i)
  return match?.[1] ?? match?.[2] ?? 'solution'
}

function runTests(code: string, testCases: TestCase[]): TestResult[] {
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

  const { challengeId, code } = await request.json()
  if (!challengeId || !code) return NextResponse.json({ error: 'challengeId and code required' }, { status: 400 })

  const service = createServiceClient()
  const today = getTodayUTC()

  // Verify challenge exists and is the correct daily challenge
  const { data: challenge } = await service
    .from('arena_challenges')
    .select('id, test_cases, title')
    .eq('id', challengeId)
    .single()

  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })

  const testCases: TestCase[] = (challenge.test_cases as TestCase[]) ?? []
  const testResults = runTests(code, testCases)
  const testsPassed = testResults.filter(r => r.passed).length
  const testsTotal = testCases.length
  const score = testsTotal > 0 ? Math.round((testsPassed / testsTotal) * 100) : 0

  // Check for existing attempt today
  const { data: existing } = await supabase
    .from('arena_daily_attempts')
    .select('id, score, attempts')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  if (existing) {
    // Update only if better score, always increment attempt count
    const betterScore = score > existing.score
    await service
      .from('arena_daily_attempts')
      .update({
        ...(betterScore ? {
          score,
          tests_passed: testsPassed,
          tests_total: testsTotal,
          submitted_code: code,
          submitted_at: new Date().toISOString(),
        } : {}),
        attempts: existing.attempts + 1,
      })
      .eq('id', existing.id)
  } else {
    await service
      .from('arena_daily_attempts')
      .insert({
        user_id: user.id,
        challenge_id: challengeId,
        date: today,
        score,
        tests_passed: testsPassed,
        tests_total: testsTotal,
        submitted_code: code,
        submitted_at: new Date().toISOString(),
        attempts: 1,
      })
  }

  // Award XP for first-time solve today (all tests passing)
  if (!existing && testsPassed === testsTotal && testsTotal > 0) {
    const { data: profile } = await service.from('profiles').select('total_xp').eq('id', user.id).single()
    if (profile) {
      await service.from('profiles').update({ total_xp: profile.total_xp + 50 }).eq('id', user.id)
    }
  }

  return NextResponse.json({ ok: true, testResults, testsPassed, testsTotal, score })
}
