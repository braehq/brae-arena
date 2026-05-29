'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { RankBadge } from '@/components/arena/rank-badge'
import type { ArenaSubmission, RankTier, GameType, Difficulty } from '@/types/arena'
import { GAME_TYPE_LABELS, DIFFICULTY_LABELS } from '@/types/arena'

const submitSchema = z.object({
  deployedUrl: z.string().url('Must be a valid URL starting with https://'),
  githubUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
})
type SubmitFields = z.infer<typeof submitSchema>

interface MatchData {
  id: string
  status: string
  started_at: string
  ends_at: string
  player_one_id: string
  player_two_id: string
  winner_id: string | null
  elo_change_p1: number | null
  elo_change_p2: number | null
  xp_awarded_p1: number | null
  xp_awarded_p2: number | null
  challenge: {
    id: string
    title: string
    description: string
    mode: GameType
    difficulty: Difficulty
    time_limit_mins: number
    reference_url: string | null
    starter_repo: string | null
  }
  player_one: { id: string; username: string | null; full_name: string | null; arena_elo: number; arena_rank_tier: RankTier }
  player_two: { id: string; username: string | null; full_name: string | null; arena_elo: number; arena_rank_tier: RankTier }
}

interface Props {
  match: MatchData
  currentUserId: string
  initialSubmissions: ArenaSubmission[]
}

const DIFF_COLOURS: Record<Difficulty, string> = {
  easy: 'text-green-400',
  medium: 'text-yellow-400',
  hard: 'text-orange-400',
  extreme: 'text-red-400',
}

export function MatchRoom({ match, currentUserId, initialSubmissions }: Props) {
  const router = useRouter()
  const [matchStatus, setMatchStatus] = useState(match.status)
  const [submissions, setSubmissions] = useState<ArenaSubmission[]>(initialSubmissions)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [submitting, setSubmitting] = useState(false)
  const [matchResult, setMatchResult] = useState<MatchData | null>(null)

  const isPlayerOne = currentUserId === match.player_one_id
  const me = isPlayerOne ? match.player_one : match.player_two
  const opponent = isPlayerOne ? match.player_two : match.player_one
  const mySubmission = submissions.find(s => s.user_id === currentUserId)
  const opponentSubmission = submissions.find(s => s.user_id !== currentUserId)

  const { register, handleSubmit, formState: { errors } } = useForm<SubmitFields>({
    resolver: zodResolver(submitSchema),
  })

  // Countdown timer
  useEffect(() => {
    if (matchStatus !== 'active') return
    const endsAt = new Date(match.ends_at).getTime()

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setTimeLeft(remaining)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [match.ends_at, matchStatus])

  const handleMatchUpdate = useCallback((updated: MatchData) => {
    setMatchStatus(updated.status)
    if (updated.status === 'complete' || updated.status === 'draw') {
      setMatchResult(updated)
    }
  }, [])

  // Supabase Realtime: match status changes
  useEffect(() => {
    const supabase = createClient()

    const matchChannel = supabase
      .channel('match:' + match.id)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'arena_matches',
        filter: `id=eq.${match.id}`,
      }, (payload) => handleMatchUpdate(payload.new as MatchData))
      .subscribe()

    const submissionsChannel = supabase
      .channel('submissions:' + match.id)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'arena_submissions',
        filter: `match_id=eq.${match.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setSubmissions(prev => [...prev.filter(s => s.id !== (payload.new as ArenaSubmission).id), payload.new as ArenaSubmission])
        } else if (payload.eventType === 'UPDATE') {
          setSubmissions(prev => prev.map(s => s.id === (payload.new as ArenaSubmission).id ? payload.new as ArenaSubmission : s))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(matchChannel)
      supabase.removeChannel(submissionsChannel)
    }
  }, [match.id, handleMatchUpdate])

  async function onSubmit({ deployedUrl, githubUrl }: SubmitFields) {
    setSubmitting(true)
    try {
      const res = await fetch('/api/arena/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id, deployedUrl, githubUrl: githubUrl || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Submission failed')
      } else {
        toast.success('Submitted! Scoring in progress…')
      }
    } catch {
      toast.error('Network error — try again')
    } finally {
      setSubmitting(false)
    }
  }

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const timerClass = timeLeft < 60 ? 'text-destructive' : timeLeft < 180 ? 'text-yellow-400' : 'text-primary'
  const progress = match.ends_at && match.started_at
    ? ((new Date(match.ends_at).getTime() - new Date(match.started_at).getTime()) - timeLeft * 1000) /
      (new Date(match.ends_at).getTime() - new Date(match.started_at).getTime()) * 100
    : 0

  // Results screen
  if (matchResult && (matchStatus === 'complete' || matchStatus === 'draw')) {
    const mySubFinal = submissions.find(s => s.user_id === currentUserId)
    const oppSubFinal = submissions.find(s => s.user_id !== currentUserId)
    const won = matchResult.winner_id === currentUserId
    const drew = matchStatus === 'draw'
    const myEloChange = isPlayerOne ? matchResult.elo_change_p1 : matchResult.elo_change_p2
    const myXp = isPlayerOne ? matchResult.xp_awarded_p1 : matchResult.xp_awarded_p2

    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <div className={`mb-4 text-6xl`}>{drew ? '🤝' : won ? '🏆' : '💀'}</div>
        <h1 className={`mb-2 text-4xl font-bold ${drew ? 'text-foreground' : won ? 'text-primary' : 'text-muted-foreground'}`}>
          {drew ? 'Draw!' : won ? 'Victory!' : 'Defeat'}
        </h1>
        <p className="mb-8 text-muted-foreground">{match.challenge.title}</p>

        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {[
            { label: me.username ?? me.full_name ?? 'You', sub: mySubFinal, isMe: true },
            { label: opponent.username ?? opponent.full_name ?? 'Opponent', sub: oppSubFinal, isMe: false },
          ].map(({ label, sub, isMe }) => (
            <div key={label} className={`rounded-xl border p-5 ${isMe ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'}`}>
              <p className="mb-3 font-semibold text-foreground">{label} {isMe && '(you)'}</p>
              {sub ? (
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Score</span>
                    <span className="font-bold text-foreground">{sub.score_total ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Performance</span>
                    <span className="text-foreground">{sub.score_performance ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Accessibility</span>
                    <span className="text-foreground">{sub.score_accessibility ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Best Practices</span>
                    <span className="text-foreground">{sub.score_best_practices ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SEO</span>
                    <span className="text-foreground">{sub.score_seo ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Speed Bonus</span>
                    <span className="text-foreground">+{sub.score_speed_bonus ?? 0}</span>
                  </div>
                  {sub.error_message && (
                    <p className="text-xs text-destructive mt-2">{sub.error_message}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No submission</p>
              )}
            </div>
          ))}
        </div>

        {(myEloChange !== null || myXp !== null) && (
          <div className="mb-8 flex justify-center gap-6">
            {myEloChange !== null && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">ELO</p>
                <p className={`text-2xl font-bold ${myEloChange >= 0 ? 'text-green-400' : 'text-destructive'}`}>
                  {myEloChange >= 0 ? '+' : ''}{myEloChange}
                </p>
              </div>
            )}
            {myXp !== null && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">XP</p>
                <p className="text-2xl font-bold text-primary">+{myXp}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => router.push('/lobby')}>Back to lobby</Button>
          <Button variant="outline" onClick={() => router.push('/history')}>Match history</Button>
        </div>
      </div>
    )
  }

  // Scoring screen
  if (matchStatus === 'scoring') {
    return (
      <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center px-4 text-center">
        <div className="animate-spin text-4xl mb-4">⚙️</div>
        <h2 className="text-2xl font-bold text-foreground">Scoring in progress…</h2>
        <p className="mt-2 text-muted-foreground">Running Lighthouse on both submissions. Hang tight.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 arena-glow">
        <div className="text-center flex-1">
          <p className="text-xs text-muted-foreground mb-1">You</p>
          <p className="font-semibold text-foreground">{me.username ?? me.full_name ?? 'You'}</p>
          <RankBadge tier={me.arena_rank_tier} elo={me.arena_elo} size="sm" />
        </div>

        <div className="flex flex-col items-center px-6">
          <p className={`text-3xl font-bold font-mono tabular-nums ${timerClass}`}>
            {mins}:{secs.toString().padStart(2, '0')}
          </p>
          <p className="text-xs text-muted-foreground">remaining</p>
          <div className="mt-2 h-1 w-32 rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-1000"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>

        <div className="text-center flex-1">
          <p className="text-xs text-muted-foreground mb-1">Opponent</p>
          <p className="font-semibold text-foreground">{opponent.username ?? opponent.full_name ?? 'Opponent'}</p>
          <RankBadge tier={opponent.arena_rank_tier} elo={opponent.arena_elo} size="sm" />
        </div>
      </div>

      {/* Opponent submitted indicator */}
      {opponentSubmission && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2">
          <span className="text-green-400">✓</span>
          <p className="text-sm text-green-400">Opponent has submitted</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Challenge card */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">{match.challenge.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">{GAME_TYPE_LABELS[match.challenge.mode]}</Badge>
                <span className={`text-xs font-medium ${DIFF_COLOURS[match.challenge.difficulty]}`}>
                  {DIFFICULTY_LABELS[match.challenge.difficulty]}
                </span>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {match.challenge.description}
          </p>
          {match.challenge.reference_url && (
            <a
              href={match.challenge.reference_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View reference →
            </a>
          )}
          {match.challenge.starter_repo && (
            <a
              href={match.challenge.starter_repo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Starter repo →
            </a>
          )}
        </div>

        {/* Submit / already submitted */}
        <div className="rounded-xl border border-border bg-card p-6">
          {mySubmission ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-400">
                <span className="text-xl">✓</span>
                <h2 className="font-semibold">Submitted!</h2>
              </div>
              <p className="text-sm text-muted-foreground break-all">{mySubmission.deployed_url}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize text-xs">
                  {mySubmission.scoring_status === 'complete' ? '✓ Scored' :
                   mySubmission.scoring_status === 'running' ? '⚙️ Scoring…' :
                   mySubmission.scoring_status === 'failed' ? '✗ Scoring failed' :
                   '⏳ Pending'}
                </Badge>
              </div>
              {mySubmission.score_total !== null && (
                <div className="text-center pt-2">
                  <p className="text-xs text-muted-foreground">Your score</p>
                  <p className="text-4xl font-bold text-primary">{mySubmission.score_total}</p>
                  <p className="text-xs text-muted-foreground">/ 100</p>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <h2 className="font-semibold text-foreground">Submit your solution</h2>
              <p className="text-sm text-muted-foreground">
                Deploy your build, then paste the live URL here. The URL must return 200.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="deployedUrl">Deployed URL *</Label>
                <Input
                  id="deployedUrl"
                  placeholder="https://your-app.vercel.app"
                  {...register('deployedUrl')}
                  disabled={submitting}
                />
                {errors.deployedUrl && (
                  <p className="text-xs text-destructive">{errors.deployedUrl.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="githubUrl">GitHub Repo (optional)</Label>
                <Input
                  id="githubUrl"
                  placeholder="https://github.com/you/repo"
                  {...register('githubUrl')}
                  disabled={submitting}
                />
                {errors.githubUrl && (
                  <p className="text-xs text-destructive">{errors.githubUrl.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={submitting || timeLeft === 0}>
                {submitting ? 'Submitting…' : timeLeft === 0 ? 'Time is up' : 'Submit solution'}
              </Button>
              {timeLeft < 300 && timeLeft > 0 && (
                <p className="text-xs text-yellow-400 text-center">
                  ⚠️ Less than {Math.ceil(timeLeft / 60)} minute{timeLeft < 120 ? '' : 's'} left
                </p>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Scoring breakdown info */}
      <div className="rounded-xl border border-border bg-card/50 p-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Scoring breakdown</p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>Deployment: 30pts</span>
          <span>·</span>
          <span>Performance: 20pts</span>
          <span>·</span>
          <span>Accessibility: 15pts</span>
          <span>·</span>
          <span>Best Practices: 15pts</span>
          <span>·</span>
          <span>SEO: 10pts</span>
          <span>·</span>
          <span>Speed Bonus: up to 10pts</span>
        </div>
      </div>
    </div>
  )
}
