'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Clock, Loader2, Trophy, Swords } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { RankBadge } from '@/components/arena/rank-badge'
import type { ArenaTeamMatch, ArenaTeamMatchPlayer, RankTier } from '@/types/arena'

interface Props {
  match: ArenaTeamMatch
  players: ArenaTeamMatchPlayer[]
  myPlayer: ArenaTeamMatchPlayer | null
  myTeamId: string | null
  canAccept: boolean
  userId: string | null
}

function formatTimeLeft(endsAt: string | null): string {
  if (!endsAt) return '--:--'
  const diff = new Date(endsAt).getTime() - Date.now()
  if (diff <= 0) return '00:00'
  const m = Math.floor(diff / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function TeamMatchRoom({ match, players: initialPlayers, myPlayer: initialMyPlayer, myTeamId, canAccept, userId }: Props) {
  const router = useRouter()
  const [matchState, setMatchState] = useState(match)
  const [players, setPlayers] = useState(initialPlayers)
  const [timeLeft, setTimeLeft] = useState(formatTimeLeft(match.ends_at))
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const myPlayer = players.find(p => p.user_id === userId) ?? initialMyPlayer

  // Countdown
  useEffect(() => {
    if (!matchState.ends_at || matchState.status !== 'active') return
    const interval = setInterval(() => setTimeLeft(formatTimeLeft(matchState.ends_at)), 1000)
    return () => clearInterval(interval)
  }, [matchState.ends_at, matchState.status])

  // Realtime
  useEffect(() => {
    const supabase = createClient()
    const ch = supabase.channel('team-match:' + match.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'arena_team_matches', filter: `id=eq.${match.id}` },
        (p) => setMatchState(prev => ({ ...prev, ...p.new })))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'arena_team_match_players', filter: `team_match_id=eq.${match.id}` },
        (p) => setPlayers(prev => [...prev.filter(x => x.id !== p.new.id), p.new as ArenaTeamMatchPlayer]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'arena_team_match_players', filter: `team_match_id=eq.${match.id}` },
        (p) => setPlayers(prev => prev.map(x => x.id === p.new.id ? { ...x, ...p.new } : x)))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [match.id])

  async function acceptChallenge() {
    setAccepting(true)
    const res = await fetch(`/api/arena/team-matches/${match.id}/accept`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) toast.error(data.error)
    else router.refresh()
    setAccepting(false)
  }

  async function submitUrl() {
    if (!url.trim()) return
    setSubmitting(true)
    const res = await fetch(`/api/arena/team-matches/${match.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deployedUrl: url }),
    })
    const data = await res.json()
    if (!res.ok) toast.error(data.error)
    else { toast.success('Submitted! Scoring…'); router.refresh() }
    setSubmitting(false)
  }

  const t1 = match.team_one as { id?: string; name?: string; tag?: string; slug?: string; team_rank_tier?: string } | null
  const t2 = match.team_two as { id?: string; name?: string; tag?: string; slug?: string; team_rank_tier?: string } | null
  const challenge = match.challenge as { title?: string; description?: string } | null
  const isComplete = ['complete', 'draw'].includes(matchState.status)
  const t1Players = players.filter(p => p.team_id === match.team_one_id)
  const t2Players = players.filter(p => p.team_id === match.team_two_id)

  function TeamColumn({ teamId, teamInfo, teamPlayers, isWinner }: {
    teamId: string
    teamInfo: typeof t1
    teamPlayers: ArenaTeamMatchPlayer[]
    isWinner: boolean
  }) {
    return (
      <div className={`rounded-xl border bg-card p-4 ${isWinner ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-border'}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <Link href={`/teams/${teamInfo?.slug}`} className="font-semibold text-foreground hover:text-primary transition-colors">
              [{teamInfo?.tag}] {teamInfo?.name}
            </Link>
            <RankBadge tier={(teamInfo?.team_rank_tier ?? 'bronze') as RankTier} size="sm" />
          </div>
          {isWinner && <Trophy className="h-5 w-5 text-yellow-400" />}
        </div>

        {/* Team score */}
        {isComplete && (teamId === match.team_one_id ? matchState.team_one_score : matchState.team_two_score) != null && (
          <div className="mb-3 text-center">
            <span className="text-3xl font-bold text-foreground">
              {teamId === match.team_one_id ? matchState.team_one_score : matchState.team_two_score}
            </span>
            <p className="text-xs text-muted-foreground">avg score</p>
          </div>
        )}

        {/* Players */}
        <div className="space-y-2">
          {teamPlayers.map(p => {
            const profile = p.profile as { username?: string; full_name?: string; arena_rank_tier?: string } | null
            return (
              <div key={p.id} className="rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-foreground">{profile?.username ?? profile?.full_name ?? 'Player'}</span>
                  <span className={p.scoring_status === 'complete' ? 'text-green-400' : p.scoring_status === 'running' ? 'text-primary' : 'text-muted-foreground'}>
                    {p.scoring_status === 'complete' ? '✓' : p.scoring_status === 'running' ? '⏳' : p.submitted_at ? '↑' : '…'}
                  </span>
                </div>
                {p.score_total != null && <div className="font-semibold text-foreground">{p.score_total} pts</div>}
              </div>
            )
          })}
          {/* Empty slots */}
          {Array.from({ length: Math.max(0, (match.format === '3v3' ? 3 : 2) - teamPlayers.length) }).map((_, i) => (
            <div key={'empty' + i} className="rounded-lg border border-dashed border-border/40 px-3 py-2 text-xs text-muted-foreground">Waiting for player…</div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="mx-auto max-w-4xl px-4">
        {/* Status bar */}
        <div className="mb-6 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm">
            <Swords className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Team Match</span>
            <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded">{match.format}</span>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            matchState.status === 'active' ? 'bg-green-500/10 text-green-400' :
            matchState.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
            matchState.status === 'complete' ? 'bg-secondary text-muted-foreground' : 'bg-primary/10 text-primary'
          }`}>
            {matchState.status}
          </span>
        </div>

        {/* Accept challenge */}
        {matchState.status === 'pending' && canAccept && (
          <div className="mb-6 rounded-xl border border-primary/30 bg-primary/10 p-4 flex items-center justify-between">
            <p className="text-sm text-foreground font-medium">Your team has been challenged. Accept to start the match.</p>
            <button onClick={acceptChallenge} disabled={accepting} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {accepting && <Loader2 className="h-4 w-4 animate-spin" />} Accept Challenge
            </button>
          </div>
        )}
        {matchState.status === 'pending' && !canAccept && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
            Waiting for [{t2?.tag}] {t2?.name} to accept the challenge…
          </div>
        )}

        {/* Timer */}
        {matchState.status === 'active' && (
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-2xl font-bold tabular-nums">{timeLeft}</span>
            </div>
          </div>
        )}

        {/* Teams */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <TeamColumn teamId={match.team_one_id} teamInfo={t1} teamPlayers={t1Players} isWinner={matchState.winner_team_id === match.team_one_id} />
          <TeamColumn teamId={match.team_two_id} teamInfo={t2} teamPlayers={t2Players} isWinner={matchState.winner_team_id === match.team_two_id} />
        </div>

        {/* ELO changes */}
        {isComplete && matchState.elo_change_t1 != null && (
          <div className="mb-6 grid grid-cols-2 gap-4 text-center text-sm">
            <div>
              <span className={`font-semibold ${(matchState.elo_change_t1 ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(matchState.elo_change_t1 ?? 0) >= 0 ? '+' : ''}{matchState.elo_change_t1} ELO
              </span>
            </div>
            <div>
              <span className={`font-semibold ${(matchState.elo_change_t2 ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(matchState.elo_change_t2 ?? 0) >= 0 ? '+' : ''}{matchState.elo_change_t2} ELO
              </span>
            </div>
          </div>
        )}

        {/* Challenge */}
        {challenge && matchState.status !== 'pending' && (
          <div className="mb-6 rounded-xl border border-border bg-card p-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Challenge</p>
            <h2 className="mb-2 text-lg font-semibold text-foreground">{challenge.title}</h2>
            <p className="text-sm text-muted-foreground">{challenge.description}</p>
          </div>
        )}

        {/* Submit form */}
        {matchState.status === 'active' && myTeamId && !myPlayer?.submitted_at && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 font-semibold text-foreground">Submit Your Build</h3>
            <div className="flex gap-2">
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://your-deployed-url.vercel.app"
                className="flex-1 px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
              <button onClick={submitUrl} disabled={submitting || !url.trim()} className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Submit
              </button>
            </div>
          </div>
        )}

        {myPlayer?.submitted_at && matchState.status === 'active' && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
            ✓ Submitted. Scoring in progress…
          </div>
        )}
      </div>
    </div>
  )
}
