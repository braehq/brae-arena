'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Play, Send, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react'
import { CodeEditor } from '@/components/arena/code-editor'
import { runTestsClient, type TestResult } from '@/lib/test-runner/run-tests-client'
import { secondsUntilReset } from '@/lib/daily-challenge'

interface TestCase { label: string; input: string; expected: string }

interface Challenge {
  id: string
  title: string
  description: string
  starter_code: string | null
  language: string
  test_cases: TestCase[] | null
  difficulty: string
}

interface Attempt {
  score: number
  tests_passed: number
  tests_total: number
  submitted_at: string
  attempts: number
}

interface Props {
  challenge: Challenge
  today: string
  myAttempt: Attempt | null
  userId: string | null
}

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function DailyChallenge({ challenge, today, myAttempt: initialAttempt, userId }: Props) {
  const router = useRouter()
  const testCases: TestCase[] = challenge.test_cases ?? []
  const [code, setCode] = useState(challenge.starter_code ?? '')
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [running, setRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [myAttempt, setMyAttempt] = useState(initialAttempt)
  const [countdown, setCountdown] = useState(secondsUntilReset())

  // Countdown to reset
  useEffect(() => {
    const t = setInterval(() => setCountdown(secondsUntilReset()), 1000)
    return () => clearInterval(t)
  }, [])

  async function handleRunTests() {
    setRunning(true)
    const results = await runTestsClient(code, testCases).catch(() => [])
    setTestResults(results)
    setRunning(false)
  }

  async function handleSubmit() {
    if (!userId) { toast.error('Sign in to submit'); return }
    setSubmitting(true)
    const res = await fetch('/api/arena/daily/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: challenge.id, code }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Submit failed'); setSubmitting(false); return }

    setTestResults(data.testResults ?? [])
    setMyAttempt({
      score: data.score,
      tests_passed: data.testsPassed,
      tests_total: data.testsTotal,
      submitted_at: new Date().toISOString(),
      attempts: (myAttempt?.attempts ?? 0) + 1,
    })

    const isPerfect = data.testsPassed === data.testsTotal && data.testsTotal > 0
    toast.success(isPerfect
      ? `🎉 Perfect score! ${data.score}/100 — +50 XP`
      : `Submitted! ${data.testsPassed}/${data.testsTotal} tests · ${data.score}/100`
    )
    router.refresh()
    setSubmitting(false)
  }

  const passed = testResults.filter(r => r.passed).length

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-card">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
            challenge.difficulty === 'easy' ? 'text-green-400 border-green-500/30 bg-green-500/10' :
            challenge.difficulty === 'medium' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
            'text-red-400 border-red-500/30 bg-red-500/10'
          }`}>{challenge.difficulty}</span>
          {testResults.length > 0 && (
            <span className={`text-xs font-semibold ${passed === testCases.length ? 'text-green-400' : 'text-amber-400'}`}>
              {passed}/{testCases.length} tests
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
          <span>Resets in</span>
          <span className="text-foreground font-semibold">{formatCountdown(countdown)}</span>
        </div>
      </div>

      {/* My best score banner */}
      {myAttempt && (
        <div className={`px-4 py-2 border-b border-border text-sm flex items-center justify-between ${
          myAttempt.score === 100 ? 'bg-green-500/10 text-green-400' : 'bg-primary/5 text-primary'
        }`}>
          <span>
            {myAttempt.score === 100 ? '🎉 ' : ''}
            Your best: <strong>{myAttempt.score}/100</strong> ({myAttempt.tests_passed}/{myAttempt.tests_total} tests)
          </span>
          <span className="text-xs opacity-70">
            {myAttempt.attempts} attempt{myAttempt.attempts !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="grid lg:grid-rows-1" style={{ minHeight: 420 }}>
        {/* Challenge brief + tests */}
        <div className="grid lg:grid-cols-[240px_1fr]">
          <div className="border-r border-border flex flex-col">
            <div className="p-4 border-b border-border">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Challenge</p>
              <p className="text-sm text-foreground leading-relaxed">{challenge.description}</p>
            </div>
            <div className="flex-1 p-3 overflow-y-auto" style={{ maxHeight: 260 }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tests</p>
              <div className="space-y-1.5">
                {testCases.map((tc, i) => {
                  const result = testResults[i]
                  return (
                    <div key={i} className={`rounded-lg px-2.5 py-2 text-xs border ${
                      !result ? 'border-border bg-secondary/20 text-muted-foreground' :
                      result.passed ? 'border-green-500/30 bg-green-500/5 text-green-400' :
                      'border-red-500/30 bg-red-500/5 text-red-400'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        {result ? (
                          result.passed ? <CheckCircle className="h-3 w-3 shrink-0" /> : <XCircle className="h-3 w-3 shrink-0" />
                        ) : <div className="h-3 w-3 rounded-full border border-current shrink-0" />}
                        <span className="truncate">{tc.label}</span>
                      </div>
                      {result && !result.passed && (
                        <p className="mt-1 pl-4.5 text-[10px] opacity-80 truncate">
                          {result.error ?? `got ${result.output || 'undefined'}`}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            {/* Buttons */}
            <div className="p-3 border-t border-border space-y-2">
              <button onClick={handleRunTests} disabled={running}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground hover:border-primary/50 disabled:opacity-50 transition-colors">
                {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Run Tests
              </button>
              <button onClick={handleSubmit} disabled={submitting || !userId}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {myAttempt ? 'Resubmit' : 'Submit'}
              </button>
              {!userId && (
                <p className="text-center text-xs text-muted-foreground">
                  <a href="/login" className="text-primary hover:underline">Sign in</a> to save your score
                </p>
              )}
            </div>
          </div>

          {/* Editor */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#1e1e1e] border-b border-zinc-700">
              <span className="text-xs text-zinc-400 font-mono">solution.js</span>
              <button onClick={() => { setCode(challenge.starter_code ?? ''); setTestResults([]) }}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                <RefreshCw className="h-3 w-3" /> Reset
              </button>
            </div>
            <div className="flex-1" style={{ minHeight: 380 }}>
              <CodeEditor value={code} onChange={setCode} language="javascript" height="380px" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
