'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Users, Calendar, Trophy, Lock, Loader2 } from 'lucide-react'
import { RankBadge } from '@/components/arena/rank-badge'
import type { ArenaTournament, ArenaTournamentParticipant, ArenaTournamentMatch, RankTier } from '@/types/arena'

interface Props {
  tournament: ArenaTournament
  participants: ArenaTournamentParticipant[]
  bracketMatches: ArenaTournamentMatch[]
  isRegistered: boolean
  userId: string | null
  userElo: number
}

export function TournamentView({ tournament, participants, bracketMatches, isRegistered: initialRegistered, userId, userElo }: Props) {
  const router = useRouter()
  const [isRegistered, setIsRegistered] = useState(initialRegistered)
  const [loading, setLoading] = useState(false)

  const canRegister = tournament.status === 'registration' &&
    !isRegistered &&
    userId &&
    userElo >= tournament.min_elo &&
    participants.length < tournament.max_participants

  async function handleRegister() {
    setLoading(true)
    const res = await fetch(`/api/arena/tournaments/${tournament.slug}/join`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Failed to register')
    } else {
      toast.success('Registered for tournament!')
      setIsRegistered(true)
      router.refresh()
    }
    setLoading(false)
  }

  // Group bracket matches by round
  const rounds = bracketMatches.reduce<Record<number, ArenaTournamentMatch[]>>((acc, m) => {
    if (!acc[m.round]) acc[m.round] = []
    acc[m.round].push(m)
    return acc
  }, {})

  const totalRounds = Object.keys(rounds).length
  const roundLabels: Record<number, string> = {
    [totalRounds]: 'Final',
    [totalRounds - 1]: 'Semi-final',
    [totalRounds - 2]: 'Quarter-final',
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{tournament.name}</h1>
            {tournament.description && <p className="mt-1 text-sm text-muted-foreground">{tournament.description}</p>}
          </div>
          <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
            tournament.status === 'active' ? 'border-green-500/50 bg-green-500/10 text-green-400' :
            tournament.status === 'registration' ? 'border-primary/50 bg-primary/10 text-primary' :
            'border-border text-muted-foreground'
          }`}>
            {tournament.status === 'active' ? 'Live' :
             tournament.status === 'registration' ? 'Open Registration' :
             tournament.status === 'upcoming' ? 'Upcoming' :
             tournament.status === 'complete' ? 'Complete' : tournament.status}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{participants.length}/{tournament.max_participants} players</span>
          <span className="flex items-center gap-1.5"><Trophy className="h-4 w-4" />{tournament.game_type.replace(/_/g, ' ')}</span>
          {tournament.min_elo > 0 && <span className="flex items-center gap-1.5"><Lock className="h-4 w-4" />{tournament.min_elo}+ ELO required</span>}
          {tournament.starts_at && <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{new Date(tournament.starts_at).toLocaleDateString()}</span>}
          {tournament.registration_ends && tournament.status === 'registration' && (
            <span className="text-amber-400">Registration closes {new Date(tournament.registration_ends).toLocaleDateString()}</span>
          )}
        </div>

        {tournament.prize_description && (
          <div className="mt-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-300">
            🏆 {tournament.prize_description}
          </div>
        )}
      </div>

      {/* Register CTA */}
      {tournament.status === 'registration' && userId && (
        <div className="mb-6">
          {isRegistered ? (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-400">
              ✓ You are registered for this tournament
            </div>
          ) : canRegister ? (
            <button
              onClick={handleRegister}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Register to Play
            </button>
          ) : userElo < tournament.min_elo ? (
            <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              You need {tournament.min_elo} ELO to enter. Your current ELO: {userElo}.
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              Tournament is full ({participants.length}/{tournament.max_participants}).
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Participants */}
        <div className="lg:col-span-1">
          <h2 className="mb-3 font-semibold text-foreground">Players</h2>
          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {participants.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No players yet</p>
            ) : participants.map((p, i) => {
              const profile = p.profile as { username: string | null; full_name: string | null; avatar_url: string | null; arena_elo: number; arena_rank_tier: string } | null
              return (
                <div key={p.id} className="flex items-center gap-2.5 px-3 py-2.5">
                  <span className="w-5 text-xs text-muted-foreground font-mono">{i + 1}</span>
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                      {(profile?.username ?? '?').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="flex-1 truncate text-sm text-foreground">{profile?.username ?? profile?.full_name ?? 'Player'}</span>
                  <RankBadge tier={(profile?.arena_rank_tier ?? 'bronze') as RankTier} size="sm" />
                  {p.status === 'eliminated' && <span className="text-xs text-muted-foreground">out</span>}
                  {p.status === 'winner' && <Trophy className="h-3.5 w-3.5 text-yellow-400" />}
                </div>
              )
            })}
          </div>
        </div>

        {/* Bracket */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 font-semibold text-foreground">Bracket</h2>
          {Object.keys(rounds).length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {tournament.status === 'registration' ? 'Bracket will be generated when registration closes.' :
                 tournament.status === 'upcoming' ? 'Bracket not yet set.' : 'No bracket data.'}
              </p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {Object.entries(rounds).map(([round, matches]) => (
                <div key={round} className="shrink-0 w-44">
                  <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {roundLabels[Number(round)] ?? `Round ${round}`}
                  </p>
                  <div className="space-y-3">
                    {matches.map(m => {
                      const p1 = m.player_one as { username?: string; full_name?: string; arena_rank_tier?: string } | null
                      const p2 = m.player_two as { username?: string; full_name?: string; arena_rank_tier?: string } | null
                      return (
                        <div key={m.id} className="rounded-lg border border-border bg-card overflow-hidden">
                          {[{ player: p1, id: m.player_one_id }, { player: p2, id: m.player_two_id }].map(({ player, id }, i) => (
                            <div key={i} className={`flex items-center gap-2 px-2.5 py-1.5 text-xs ${
                              m.winner_id === id ? 'bg-primary/10 font-semibold text-foreground' : 'text-muted-foreground'
                            } ${i === 0 ? 'border-b border-border/50' : ''}`}>
                              {m.winner_id === id && <span className="text-primary">›</span>}
                              <span className="truncate">{player?.username ?? player?.full_name ?? (m.status === 'bye' ? 'BYE' : 'TBD')}</span>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
