'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, Clock, Trophy, Share2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { RankBadge } from '@/components/arena/rank-badge'
import { MatchChat } from '@/components/arena/match-chat'
import { toast } from 'sonner'
import type { ArenaMatch, ArenaSubmission } from '@/types/arena'

interface Props {
  match: ArenaMatch
  submissions: ArenaSubmission[]
  spectatorCount: number
  userId: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialChat?: any[]
}

function formatTimeLeft(endsAt: string | null): string {
  if (!endsAt) return '--:--'
  const diff = new Date(endsAt).getTime() - Date.now()
  if (diff <= 0) return '00:00'
  const m = Math.floor(diff / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function SpectateRoom({ match, submissions: initialSubs, spectatorCount: initialCount, userId, initialChat = [] }: Props) {
  const [matchState, setMatchState] = useState(match)
  const [submissions, setSubmissions] = useState(initialSubs)
  const [spectatorCount, setSpectatorCount] = useState(initialCount)
  const [timeLeft, setTimeLeft] = useState(formatTimeLeft(match.ends_at))

  const p1 = match.player_one as (ArenaMatch['player_one'] & { id: string }) | undefined
  const p2 = match.player_two as (ArenaMatch['player_two'] & { id: string }) | undefined
  const p1Sub = submissions.find(s => s.user_id === match.player_one_id)
  const p2Sub = submissions.find(s => s.user_id === match.player_two_id)

  // Countdown
  useEffect(() => {
    if (!matchState.ends_at || matchState.status !== 'active') return
    const interval = setInterval(() => setTimeLeft(formatTimeLeft(matchState.ends_at)), 1000)
    return () => clearInterval(interval)
  }, [matchState.ends_at, matchState.status])

  // Realtime — match state + submissions
  useEffect(() => {
    const supabase = createClient()

    const matchChannel = supabase
      .channel('spectate:match:' + match.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'arena_matches', filter: `id=eq.${match.id}` },
        (payload) => setMatchState(prev => ({ ...prev, ...payload.new }))
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'arena_submissions', filter: `match_id=eq.${match.id}` },
        (payload) => setSubmissions(prev => [...prev.filter(s => s.id !== payload.new.id), payload.new as ArenaSubmission])
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'arena_submissions', filter: `match_id=eq.${match.id}` },
        (payload) => setSubmissions(prev => prev.map(s => s.id === payload.new.id ? { ...s, ...payload.new } : s))
      )
      .subscribe()

    // Spectator count via presence
    const presenceChannel = supabase
      .channel('spectate:presence:' + match.id, { config: { presence: { key: userId ?? 'anon' } } })
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        setSpectatorCount(Object.keys(state).length)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user_id: userId, joined_at: new Date().toISOString() })
        }
      })

    return () => {
      supabase.removeChannel(matchChannel)
      supabase.removeChannel(presenceChannel)
    }
  }, [match.id, userId])

  const isComplete = matchState.status === 'complete'
  const p1Submitted = !!p1Sub
  const p2Submitted = !!p2Sub

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="mx-auto max-w-4xl px-4">

        {/* Spectator banner */}
        <div className="mb-6 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm text-primary">
            <Eye className="h-4 w-4" />
            <span className="font-medium">Spectating live match</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Eye className="h-3 w-3" />
            <span>{spectatorCount} watching</span>
          </div>
        </div>

        {/* Timer */}
        {matchState.status === 'active' && (
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-2xl font-bold tabular-nums text-foreground">{timeLeft}</span>
            </div>
          </div>
        )}

        {/* Players */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          {[
            { player: p1, sub: p1Sub, isWinner: matchState.winner_id === match.player_one_id },
            { player: p2, sub: p2Sub, isWinner: matchState.winner_id === match.player_two_id },
          ].map(({ player, sub, isWinner }, i) => (
            <div key={i} className={`rounded-xl border bg-card p-4 ${isWinner ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-border'}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {player?.username ?? player?.full_name ?? 'Player'}
                  </p>
                  <RankBadge tier={(player as { arena_rank_tier?: string })?.arena_rank_tier as Parameters<typeof RankBadge>[0]['tier'] ?? 'bronze'} size="sm" />
                </div>
                {isWinner && <Trophy className="h-5 w-5 text-yellow-500" />}
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Status</span>
                  <span className={sub ? 'text-green-400' : 'text-muted-foreground'}>
                    {sub ? '✓ Submitted' : matchState.status === 'active' ? 'Building…' : '—'}
                  </span>
                </div>
                {sub && sub.score_total != null && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Score</span>
                      <span className="font-semibold text-foreground">{sub.score_total}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Perf</span><span>{sub.score_performance ?? '—'}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>A11y</span><span>{sub.score_accessibility ?? '—'}</span>
                    </div>
                  </>
                )}
                {isComplete && matchState.elo_change_p1 != null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">ELO</span>
                    <span className={i === 0
                      ? (matchState.elo_change_p1 >= 0 ? 'text-green-400' : 'text-red-400')
                      : (matchState.elo_change_p2 != null && matchState.elo_change_p2 >= 0 ? 'text-green-400' : 'text-red-400')
                    }>
                      {i === 0
                        ? (matchState.elo_change_p1 >= 0 ? '+' : '') + matchState.elo_change_p1
                        : matchState.elo_change_p2 != null
                          ? (matchState.elo_change_p2 >= 0 ? '+' : '') + matchState.elo_change_p2
                          : '—'
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Challenge */}
        {match.challenge && (
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Challenge</p>
            <h2 className="mb-2 text-lg font-semibold text-foreground">{match.challenge.title}</h2>
            <p className="text-sm text-muted-foreground">{match.challenge.description}</p>
          </div>
        )}

        {/* Share button */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href)
              toast.success('Link copied!')
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" /> Share match
          </button>
          {isComplete && (
            <Link href="/leaderboard" className="text-sm text-primary hover:underline">← Leaderboard</Link>
          )}
        </div>

        {/* Chat */}
        <div className="mt-6">
          <MatchChat
            matchId={match.id}
            userId={userId}
            initialMessages={initialChat}
            readOnly={false}
          />
        </div>
      </div>
    </div>
  )
}
