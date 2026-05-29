import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { RankBadge } from '@/components/arena/rank-badge'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Leaderboard' }
export const revalidate = 60

export default async function LeaderboardPage() {
  const supabase = await createClient()

  const { data: players } = await supabase
    .from('profiles')
    .select('id, username, full_name, country, arena_elo, arena_rank_tier, arena_wins, arena_losses, arena_matches_played, total_xp, arena_streak')
    .order('arena_elo', { ascending: false })
    .gt('arena_matches_played', 0)
    .limit(100)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-14">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Leaderboard</h1>
            <p className="mt-1 text-muted-foreground">Top {players?.length ?? 0} ranked players by ELO</p>
          </div>

          {(!players || players.length === 0) ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <p className="text-4xl mb-4">🏆</p>
              <h2 className="text-xl font-semibold text-foreground mb-2">No ranked players yet</h2>
              <p className="text-muted-foreground mb-6">Be the first to complete a ranked match.</p>
              <Link href="/signup" className="text-primary hover:underline text-sm">Create your account →</Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-12">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Player</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Rank</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">W/L</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">Win Rate</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">Streak</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground hidden lg:table-cell">XP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {players.map((player, i) => {
                    const name = player.username ?? player.full_name ?? 'Player'
                    const wr = player.arena_matches_played > 0
                      ? Math.round((player.arena_wins / player.arena_matches_played) * 100)
                      : 0
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null

                    return (
                      <tr key={player.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground font-mono">
                          {medal ?? `#${i + 1}`}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/profile/${player.username ?? player.id}`}
                            className="font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {name}
                          </Link>
                          {player.country && (
                            <span className="ml-2 text-xs text-muted-foreground">{player.country}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <RankBadge tier={player.arena_rank_tier} elo={player.arena_elo} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          <span className="text-green-400">{player.arena_wins}</span>
                          <span className="mx-1">/</span>
                          <span className="text-destructive">{player.arena_losses}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">{wr}%</td>
                        <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
                          {player.arena_streak > 0 ? `🔥 ${player.arena_streak}` : player.arena_streak}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">
                          {player.total_xp.toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
