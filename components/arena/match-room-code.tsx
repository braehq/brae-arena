'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Play, Send, Clock, CheckCircle, XCircle, Loader2, Share2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CodeEditor } from '@/components/arena/code-editor'
import { LivePreview } from '@/components/arena/live-preview'
import { RankBadge } from '@/components/arena/rank-badge'
import { runTestsClient, type TestResult } from '@/lib/test-runner/run-tests-client'
import { runCssBattleTests } from '@/lib/css-battle-runner'
import type { ArenaMatch, ArenaSubmission, RankTier } from '@/types/arena'

interface TestCase { label: string; input: string; expected: string }

interface Props {
  match: ArenaMatch & {
    challenge: {
      title: string
      description: string
      challenge_type: string
      starter_code: string | null
      language: string
      test_cases: TestCase[] | null
      time_limit_mins: number
    } | null
  }
  currentUserId: string
  initialSubmissions: ArenaSubmission[]
}

function formatTimeLeft(endsAt: string | null): string {
  if (!endsAt) return '--:--'
  const diff = new Date(endsAt).getTime() - Date.now()
  if (diff <= 0) return '00:00'
  const m = Math.floor(diff / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function MatchRoomCode({ match, currentUserId, initialSubmissions }: Props) {
  const router = useRouter()
  const challenge = match.challenge
  const isHtml = challenge?.language === 'html'
  const testCases: TestCase[] = challenge?.test_cases ?? []

  const [code, setCode] = useState(challenge?.starter_code ?? '')
  const [timeLeft, setTimeLeft] = useState(formatTimeLeft(match.ends_at))
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [running, setRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(
    initialSubmissions.some(s => s.user_id === currentUserId)
  )
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [matchState, setMatchState] = useState(match)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const p1 = match.player_one as { id?: string; username?: string; full_name?: string; arena_rank_tier?: string } | null
  const p2 = match.player_two as { id?: string; username?: string; full_name?: string; arena_rank_tier?: string } | null
  const me = p1?.id === currentUserId ? p1 : p2
  const opponent = p1?.id === currentUserId ? p2 : p1
  const mySubmission = submissions.find(s => s.user_id === currentUserId)
  const opponentSubmission = submissions.find(s => s.user_id !== currentUserId)

  // Countdown
  useEffect(() => {
    if (!matchState.ends_at || matchState.status !== 'active') return
    const interval = setInterval(() => setTimeLeft(formatTimeLeft(matchState.ends_at)), 1000)
    return () => clearInterval(interval)
  }, [matchState.ends_at, matchState.status])

  // Live preview debounce for HTML mode
  const [previewHtml, setPreviewHtml] = useState(code)
  useEffect(() => {
    if (!isHtml) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setPreviewHtml(code), 800)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [code, isHtml])

  // Realtime
  useEffect(() => {
    const supabase = createClient()
    const ch = supabase.channel('code-match:' + match.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'arena_matches', filter: `id=eq.${match.id}` },
        p => setMatchState(prev => ({ ...prev, ...p.new })))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'arena_submissions', filter: `match_id=eq.${match.id}` },
        p => setSubmissions(prev => [...prev.filter(s => s.id !== p.new.id), p.new as ArenaSubmission]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'arena_submissions', filter: `match_id=eq.${match.id}` },
        p => setSubmissions(prev => prev.map(s => s.id === p.new.id ? { ...s, ...p.new } : s)))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [match.id])

  async function handleRunTests() {
    if (!testCases.length) return
    setRunning(true)
    try {
      const results = isHtml
        ? await runCssBattleTests(code, testCases)
        : await runTestsClient(code, testCases)
      setTestResults(results)
    } catch (e) {
      toast.error('Test runner error: ' + String(e))
    }
    setRunning(false)
  }

  async function handleSubmit() {
    setSubmitting(true)
    // For CSS Battle: run DOM tests first to get results to send to server
    let finalResults = testResults
    if (isHtml && testCases.length > 0 && testResults.length === 0) {
      try { finalResults = await runCssBattleTests(code, testCases) } catch {}
      setTestResults(finalResults)
    }
    const res = await fetch('/api/arena/submit-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId: match.id,
        code,
        ...(isHtml ? { cssTestResults: finalResults } : {}),
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Submit failed')
      setSubmitting(false)
      return
    }
    setTestResults(data.testResults ?? [])
    setSubmitted(true)
    toast.success(`Submitted! ${data.testsPassed}/${data.testsTotal} tests passing`)
    setSubmitting(false)
  }

  const isComplete = ['complete', 'draw'].includes(matchState.status)
  const won = matchState.winner_id === currentUserId
  const passedCount = testResults.filter(r => r.passed).length

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col bg-background">

      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2 shrink-0">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-muted-foreground">{challenge?.title ?? 'Challenge'}</span>
          </div>
          {testCases.length > 0 && testResults.length > 0 && (
            <span className={`text-xs font-semibold ${passedCount === testCases.length ? 'text-green-400' : 'text-amber-400'}`}>
              {passedCount}/{testCases.length} tests
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Opponent status */}
          <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <span className={`h-2 w-2 rounded-full ${opponentSubmission ? 'bg-green-400' : 'bg-muted-foreground'}`} />
            <span>{opponent?.username ?? 'Opponent'}: {opponentSubmission ? 'Submitted' : 'Building…'}</span>
          </div>

          {/* Timer */}
          <div className={`flex items-center gap-1.5 font-mono text-sm font-bold tabular-nums ${
            timeLeft.startsWith('00:') && !timeLeft.startsWith('00:0') ? 'text-destructive' : 'text-foreground'
          }`}>
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {timeLeft}
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 min-h-0">

        {/* Left — challenge brief + test results */}
        <div className="w-72 shrink-0 flex flex-col border-r border-border overflow-hidden">
          {/* Brief */}
          <div className="p-4 border-b border-border overflow-y-auto max-h-48">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Challenge</p>
            <p className="text-sm text-foreground leading-relaxed">{challenge?.description}</p>
          </div>

          {/* Test results */}
          {testCases.length > 0 && (
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tests</p>
              {testCases.map((tc, i) => {
                const result = testResults[i]
                return (
                  <div key={i} className={`rounded-lg px-3 py-2 text-xs border ${
                    !result ? 'border-border bg-secondary/30 text-muted-foreground' :
                    result.passed ? 'border-green-500/30 bg-green-500/10 text-green-400' :
                    'border-destructive/30 bg-destructive/10 text-destructive'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      {result ? (
                        result.passed
                          ? <CheckCircle className="h-3 w-3 shrink-0" />
                          : <XCircle className="h-3 w-3 shrink-0" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-current shrink-0" />
                      )}
                      <span className="truncate">{tc.label}</span>
                    </div>
                    {result && !result.passed && result.error && (
                      <p className="mt-1 pl-4.5 text-[10px] opacity-80 truncate">{result.error}</p>
                    )}
                    {result && !result.passed && !result.error && (
                      <p className="mt-1 pl-4.5 text-[10px] opacity-80">
                        got {result.output || 'undefined'}, expected {result.expected}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Action buttons */}
          {!isComplete && (
            <div className="p-3 border-t border-border space-y-2">
              {testCases.length > 0 && (
                <button
                  onClick={handleRunTests}
                  disabled={running || submitted}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground hover:border-primary/50 disabled:opacity-50 transition-colors"
                >
                  {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  Run Tests
                </button>
              )}
              {!submitted ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Submit
                </button>
              ) : (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs font-medium text-green-400 text-center">
                  ✓ Submitted — waiting for opponent
                </div>
              )}
            </div>
          )}
        </div>

        {/* Centre — code editor */}
        <div className={`flex-1 min-w-0 flex flex-col ${isHtml ? 'border-r border-border' : ''}`}>
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#1e1e1e] border-b border-zinc-700 shrink-0">
            <span className="text-xs text-zinc-400 font-mono">{isHtml ? 'index.html' : `solution.${challenge?.language ?? 'js'}`}</span>
            <div className="flex items-center gap-1">
              <div className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
              <div className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
              <div className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <CodeEditor
              value={code}
              onChange={setCode}
              language={challenge?.language ?? 'javascript'}
              readOnly={submitted && !isComplete}
            />
          </div>
        </div>

        {/* Right — live preview (HTML mode only) */}
        {isHtml && (
          <div className="w-80 shrink-0 flex flex-col">
            <div className="flex items-center px-3 py-1.5 bg-secondary border-b border-border shrink-0">
              <span className="text-xs text-muted-foreground">Preview</span>
            </div>
            <div className="flex-1 min-h-0">
              <LivePreview html={previewHtml} />
            </div>
          </div>
        )}
      </div>

      {/* Result overlay */}
      {isComplete && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
          <div className="rounded-2xl border border-border bg-card p-8 text-center max-w-sm w-full mx-4 shadow-2xl">
            <div className="text-5xl mb-4">{matchState.status === 'draw' ? '🤝' : won ? '🏆' : '😔'}</div>
            <h2 className="text-2xl font-bold text-foreground mb-1">
              {matchState.status === 'draw' ? 'Draw!' : won ? 'You won!' : 'You lost'}
            </h2>
            {mySubmission && (
              <p className="text-sm text-muted-foreground mb-4">
                {mySubmission.tests_passed ?? 0}/{mySubmission.tests_total ?? testCases.length} tests · {mySubmission.score_total ?? 0} pts
              </p>
            )}
            <div className="flex flex-wrap gap-2 justify-center">
              <button onClick={() => router.push('/lobby')} className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:opacity-90">
                Play Again
              </button>
              <button onClick={() => router.push(`/match/${match.id}/replay`)} className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                Replay
              </button>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/match/${match.id}`
                  navigator.clipboard.writeText(url).then(() => toast.success('Link copied to clipboard!'))
                }}
                className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <Share2 className="h-3.5 w-3.5" /> Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
