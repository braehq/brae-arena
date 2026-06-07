'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Clock, Send, Loader2, Share2, Check, X, Eye, Code2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { runCssBattleTests, type CssTestCase } from '@/lib/css-battle-runner'
import { scoreCssGolf } from '@/lib/css-golf-runner'
import type { ArenaMatch, ArenaSubmission } from '@/types/arena'

interface CssGolfChallenge {
  title: string
  description: string
  test_cases: CssTestCase[] | null
  time_limit_mins: number
  starter_code: string | null
  target_image_url: string | null
  parLength: number | null
}

type CssGolfMatch = Omit<ArenaMatch, 'challenge'> & {
  challenge: CssGolfChallenge | null
}

interface Props {
  match: CssGolfMatch
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

const STARTER_PLACEHOLDER = `<!-- canvas: 400×300px -->
<style>
  /* your styles */
</style>
<!-- your HTML -->`

export function MatchRoomCssGolf({ match, currentUserId, initialSubmissions }: Props) {
  const router = useRouter()
  const challenge = match.challenge
  const testCases: CssTestCase[] = useMemo(() => challenge?.test_cases ?? [], [challenge])
  const par = challenge?.parLength ?? null
  const targetImageUrl = challenge?.target_image_url ?? null

  const [code, setCode] = useState(challenge?.starter_code ?? '')
  const [liveHtml, setLiveHtml] = useState(challenge?.starter_code ?? '')
  const [evaluatedHtml, setEvaluatedHtml] = useState(challenge?.starter_code ?? '')
  const [overlayOpacity, setOverlayOpacity] = useState(0.5)
  const [testResults, setTestResults] = useState<Array<{ label: string; passed: boolean }>>([])
  const testsRunning = liveHtml !== evaluatedHtml && testCases.length > 0
  const [timeLeft, setTimeLeft] = useState(formatTimeLeft(match.ends_at))
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(initialSubmissions.some(s => s.user_id === currentUserId))
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [matchState, setMatchState] = useState(match)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const passedCount = testResults.filter(r => r.passed).length
  const allPassed = testResults.length > 0 && passedCount === testResults.length
  const overPar = par !== null && code.length > par
  const timeCritical = timeLeft.startsWith('00:') && !timeLeft.startsWith('00:0')
  const isComplete = ['complete', 'draw'].includes(matchState.status)
  const won = matchState.winner_id === currentUserId

  const p1 = match.player_one as { id?: string; username?: string; full_name?: string } | null
  const p2 = match.player_two as { id?: string; username?: string; full_name?: string } | null
  const opponent = p1?.id === currentUserId ? p2 : p1
  const mySubmission = submissions.find(s => s.user_id === currentUserId)
  const opponentSubmission = submissions.find(s => s.user_id !== currentUserId)

  // Debounced live preview update (400ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setLiveHtml(code), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [code])

  // Run DOM checks against the live render whenever it updates
  useEffect(() => {
    if (!liveHtml || testCases.length === 0) return
    let cancelled = false
    void runCssBattleTests(liveHtml, testCases).then(results => {
      if (cancelled) return
      setTestResults(results.map(r => ({ label: r.label, passed: r.passed })))
      setEvaluatedHtml(liveHtml)
    })
    return () => { cancelled = true }
  }, [liveHtml, testCases])

  // Countdown timer
  useEffect(() => {
    if (!matchState.ends_at || matchState.status !== 'active') return
    const interval = setInterval(() => setTimeLeft(formatTimeLeft(matchState.ends_at)), 1000)
    return () => clearInterval(interval)
  }, [matchState.ends_at, matchState.status])

  // Realtime — match state + submissions
  useEffect(() => {
    const supabase = createClient()
    const ch = supabase.channel('css-golf-match:' + match.id)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'arena_matches',
        filter: `id=eq.${match.id}`,
      }, p => setMatchState(prev => ({ ...prev, ...(p.new as object) })))
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'arena_submissions',
        filter: `match_id=eq.${match.id}`,
      }, p => setSubmissions(prev => [
        ...prev.filter(s => s.id !== (p.new as ArenaSubmission).id),
        p.new as ArenaSubmission,
      ]))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'arena_submissions',
        filter: `match_id=eq.${match.id}`,
      }, p => setSubmissions(prev =>
        prev.map(s => s.id === (p.new as ArenaSubmission).id ? { ...s, ...(p.new as ArenaSubmission) } : s)
      ))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [match.id])

  async function handleSubmit() {
    if (!code.trim()) { toast.error('Write some code first'); return }
    setSubmitting(true)
    const res = await fetch('/api/arena/submit-css-golf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId: match.id,
        html: code,
        testsPassed: passedCount,
        testsTotal: testCases.length,
      }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Submit failed'); setSubmitting(false); return }
    setSubmitted(true)
    toast.success(`Submitted! ${data.testsPassed}/${data.testsTotal} passing · ${data.charCount} chars · ${data.score} pts`)
    setSubmitting(false)
  }

  // Live score preview (matches server formula)
  const liveScore = useMemo(
    () => scoreCssGolf(code, passedCount, testCases.length, par),
    [code, passedCount, testCases.length, par],
  )

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col bg-background">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2 shrink-0">
        <div className="flex items-center gap-3 text-sm min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
            <span className="text-muted-foreground truncate">{challenge?.title ?? 'CSS Golf'}</span>
          </div>
          {testResults.length > 0 && (
            <span className={`text-xs font-semibold shrink-0 ${allPassed ? 'text-green-400' : 'text-amber-400'}`}>
              {passedCount}/{testResults.length} checks
            </span>
          )}
          {testsRunning && (
            <span className="text-xs text-muted-foreground shrink-0">checking…</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <span className={`h-2 w-2 rounded-full ${opponentSubmission ? 'bg-green-400' : 'bg-muted-foreground'}`} />
            <span>
              {opponent?.username ?? 'Opponent'}: {
                opponentSubmission
                  ? `${opponentSubmission.tests_passed ?? 0}/${testCases.length} · ${opponentSubmission.score_total ?? 0} pts`
                  : 'working…'
              }
            </span>
          </div>
          <div className={`flex items-center gap-1.5 font-mono text-sm font-bold tabular-nums ${timeCritical ? 'text-destructive' : 'text-foreground'}`}>
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {timeLeft}
          </div>
        </div>
      </div>

      {/* ── Main 3-column grid ── */}
      <div className="mx-auto w-full max-w-[1320px] flex-1 grid grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-[240px_1fr_440px]">

        {/* ── Col 1: Brief · Golf meter · Checks · Submit ── */}
        <div className="space-y-4">

          {/* Brief */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Goal</p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{challenge?.description}</p>
          </div>

          {/* Golf par meter */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground uppercase tracking-wider font-semibold">Characters</span>
              {allPassed && (
                <span className={`font-medium ${code.length <= (par ?? Infinity) ? 'text-green-400' : 'text-foreground'}`}>
                  {par !== null && code.length <= par ? '✦ under par' : '✓ all pass'}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`font-mono text-3xl font-bold tabular-nums leading-none ${overPar ? 'text-amber-400' : 'text-foreground'}`}>
                {code.length}
              </span>
              {par !== null && (
                <span className="text-sm text-muted-foreground">/ par {par}</span>
              )}
            </div>
            {par !== null && (
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${overPar ? 'bg-amber-400' : allPassed ? 'bg-green-500' : 'bg-primary'}`}
                  style={{ width: `${Math.min(100, Math.round((code.length / par) * 100))}%` }}
                />
              </div>
            )}
            {allPassed && (
              <p className="text-xs text-muted-foreground">
                Score preview: <span className="font-semibold text-foreground">{liveScore.scoreTotal} pts</span>
                {liveScore.brevityBonus > 0 && (
                  <span className="text-green-400"> (+{liveScore.brevityBonus} golf)</span>
                )}
              </p>
            )}
          </div>

          {/* DOM checks */}
          {testResults.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Checks</span>
                <span className={`text-xs font-semibold ${allPassed ? 'text-green-400' : 'text-amber-400'}`}>
                  {passedCount}/{testResults.length}
                </span>
              </div>
              <ul className="divide-y divide-border/60">
                {testResults.map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5 px-4 py-2">
                    <span className={`mt-0.5 shrink-0 ${r.passed ? 'text-green-400' : 'text-muted-foreground/40'}`}>
                      {r.passed ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    </span>
                    <span className="text-xs text-foreground leading-relaxed">{r.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Submit / submitted state */}
          {!isComplete && (
            !submitted ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit solution
              </button>
            ) : (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2.5 text-sm font-medium text-green-400 text-center">
                ✓ Submitted — waiting for opponent
              </div>
            )
          )}
        </div>

        {/* ── Col 2: Code editor ── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your code</span>
          </div>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            disabled={submitted && !isComplete}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="HTML code editor"
            placeholder={STARTER_PLACEHOLDER}
            className="flex-1 resize-none rounded-xl border border-border bg-[#1e1e1e] p-4 font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-primary/60 disabled:opacity-60 transition-colors"
            style={{ minHeight: '480px' }}
          />
        </div>

        {/* ── Col 3: Onion-skin preview ── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview</span>
            </div>
            {targetImageUrl && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>yours</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(overlayOpacity * 100)}
                  onChange={e => setOverlayOpacity(Number(e.target.value) / 100)}
                  className="w-20 cursor-pointer accent-primary"
                  aria-label="Blend your render with the target — drag left for yours, right for target"
                />
                <span>target</span>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Fixed 400×300 canvas — matches the challenge spec exactly */}
            <div className="relative overflow-hidden" style={{ width: '400px', height: '300px' }}>
              <iframe
                srcDoc={liveHtml}
                sandbox="allow-scripts allow-same-origin"
                title="Your render"
                className="absolute inset-0 border-0"
                style={{ width: '400px', height: '300px' }}
              />
              {targetImageUrl && (
                <Image
                  src={targetImageUrl}
                  alt="Target overlay"
                  width={400}
                  height={300}
                  draggable={false}
                  className="absolute inset-0 pointer-events-none select-none"
                  style={{ opacity: overlayOpacity }}
                />
              )}
            </div>

            {/* Slider label + target thumbnail strip */}
            {targetImageUrl && (
              <div className="flex items-center gap-3 border-t border-border px-3 py-2">
                <span className="text-xs text-muted-foreground shrink-0">Target:</span>
                <Image
                  src={targetImageUrl}
                  alt="Target reference"
                  width={48}
                  height={36}
                  className="rounded"
                  style={{ height: '36px', width: 'auto' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Result overlay ── */}
      {isComplete && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
          <div className="rounded-2xl border border-border bg-card p-8 text-center max-w-sm w-full mx-4 shadow-2xl">
            <div className="text-5xl mb-4">
              {matchState.status === 'draw' ? '🤝' : won ? '🏆' : '😔'}
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-1">
              {matchState.status === 'draw' ? 'Draw!' : won ? 'You won!' : 'You lost'}
            </h2>
            {mySubmission && (
              <p className="text-sm text-muted-foreground mb-4">
                {mySubmission.tests_passed ?? 0}/{testCases.length} checks
                {(mySubmission as { submitted_code?: string | null }).submitted_code
                  ? ` · ${JSON.parse((mySubmission as { submitted_code: string }).submitted_code).html?.length ?? 0} chars`
                  : ''
                }
                {' · '}{mySubmission.score_total ?? 0} pts
              </p>
            )}
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => router.push('/lobby')}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Play Again
              </button>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/match/${match.id}`
                  navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'))
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
