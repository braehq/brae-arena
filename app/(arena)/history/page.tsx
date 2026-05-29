import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { RankBadge } from '@/components/arena/rank-badge'
import type { Metadata } from 'next'
import { GAME_TYPE_LABELS } from '@/types/arena'

export const metadata: Metadata = { title: 'Match History' }

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: matches } = await supabase
    .from('arena_matches')
    .select(`
      id, mode, game_type, status, winner_id, elo_change_p1, elo_change_p2, xp_awarded_p1, xp_awarded_p2, player_one_id, created_at,
      challenge:arena_challenges(title, mode, difficulty),
      player_one:profiles!arena_matches_player_one_id_fkey(id, username, full_name, arena_rank_tier),
      player_two:profiles!arena_matches_player_two_id_fkey(id, username, full_name, arena_rank_tier)
    `)
    .or(`player_one_id.eq.${user!.id},player_two_id.eq.${user!.id}`)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Match History</h1>

      {(!matches || matches.length === 0) ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-4xl mb-4">⚔️</p>
          <h2 className="text-xl font-semibold text-foreground mb-2">No matches yet</h2>
          <p className="text-muted-foreground mb-6">Join a queue and play your first match.</p>
          <Link href="/lobby" className="text-primary hover:underline text-sm">Go to lobby →</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {matches.map((match) => {
            const isP1 = match.player_one_id === user!.id
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const opponent = isP1 ? match.player_two as any : match.player_one as any
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const challenge = match.challenge as any
            const won = match.winner_id === user!.id
            const drew = match.status === 'draw'
            const cancelled = match.status === 'cancelled'
            const eloChange = isP1 ? match.elo_change_p1 : match.elo_change_p2
            const xpAwarded = isP1 ? match.xp_awarded_p1 : match.xp_awarded_p2
            const opponentName = opponent?.username ?? opponent?.full_name ?? 'Unknown'
            const date = new Date(match.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

            return (
              <Link
                key={match.id}
                href={`/match/${match.id}`}
                className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 hover:bg-muted/30 transition-colors"
              >
                {/* Result indicator */}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                  cancelled ? 'bg-muted text-muted-foreground' :
                  drew ? 'bg-muted text-foreground' :
                  won ? 'bg-green-500/20 text-green-400' :
                  'bg-destructive/20 text-destructive'
                }`}>
                  {cancelled ? '—' : drew ? '=' : won ? 'W' : 'L'}
                </div>

                {/* Match info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{challenge?.title ?? 'Challenge'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">vs {opponentName}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{GAME_TYPE_LABELS[match.game_type as keyof typeof GAME_TYPE_LABELS] ?? match.game_type}</span>
                    <span className="text-xs text-muted-foreground capitalize">· {match.mode}</span>
                  </div>
                </div>

                {/* ELO change */}
                {eloChange !== null && eloChange !== undefined && match.mode === 'ranked' && (
                  <span className={`text-sm font-semibold ${eloChange >= 0 ? 'text-green-400' : 'text-destructive'}`}>
                    {eloChange >= 0 ? '+' : ''}{eloChange} ELO
                  </span>
                )}

                {/* XP */}
                {xpAwarded !== null && xpAwarded !== undefined && (
                  <span className="text-xs text-primary hidden sm:block">+{xpAwarded} XP</span>
                )}

                {/* Opponent rank */}
                {opponent?.arena_rank_tier && (
                  <RankBadge tier={opponent.arena_rank_tier} size="sm" showElo={false} />
                )}

                <span className="text-xs text-muted-foreground hidden md:block shrink-0">{date}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
