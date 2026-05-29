import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { RankBadge } from '@/components/arena/rank-badge'
import Link from 'next/link'
import type { Metadata } from 'next'
import { GAME_TYPE_LABELS } from '@/types/arena'

export const revalidate = 60

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return { title: `${username}'s Profile` }
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()

  // Try username first, then fall back to id
  let { data: profile } = await supabase
    .from('profiles')
    .select('id, username, full_name, country, arena_elo, arena_rank_tier, arena_wins, arena_losses, arena_streak, arena_matches_played, total_xp, created_at')
    .eq('username', username)
    .single()

  if (!profile) {
    ({ data: profile } = await supabase
      .from('profiles')
      .select('id, username, full_name, country, arena_elo, arena_rank_tier, arena_wins, arena_losses, arena_streak, arena_matches_played, total_xp, created_at')
      .eq('id', username)
      .single())
  }

  if (!profile) notFound()

  const { data: recentMatches } = await supabase
    .from('arena_matches')
    .select(`
      id, mode, game_type, status, winner_id, created_at,
      challenge:arena_challenges(title, difficulty),
      player_one:profiles!arena_matches_player_one_id_fkey(id, username, full_name),
      player_two:profiles!arena_matches_player_two_id_fkey(id, username, full_name)
    `)
    .or(`player_one_id.eq.${profile.id},player_two_id.eq.${profile.id}`)
    .eq('status', 'complete')
    .order('created_at', { ascending: false })
    .limit(10)

  const displayName = profile.username ?? profile.full_name ?? 'Player'
  const wr = profile.arena_matches_played > 0
    ? Math.round((profile.arena_wins / profile.arena_matches_played) * 100)
    : 0
  const memberSince = new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-14">
        <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
          {/* Profile header */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 text-3xl font-bold text-primary shrink-0">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
              {profile.country && <p className="text-sm text-muted-foreground">{profile.country}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <RankBadge tier={profile.arena_rank_tier} elo={profile.arena_elo} size="md" />
                {profile.arena_streak > 2 && (
                  <span className="text-sm font-medium text-orange-400">🔥 {profile.arena_streak} win streak</span>
                )}
                <span className="text-xs text-muted-foreground">Member since {memberSince}</span>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Matches', value: profile.arena_matches_played },
              { label: 'Wins', value: profile.arena_wins },
              { label: 'Win Rate', value: `${wr}%` },
              { label: 'Total XP', value: profile.total_xp.toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-4 text-center">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
              </div>
            ))}
          </div>

          {/* Recent matches */}
          <div>
            <h2 className="mb-4 font-semibold text-foreground">Recent Matches</h2>
            {(!recentMatches || recentMatches.length === 0) ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <p className="text-muted-foreground">No completed matches yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentMatches.map((match) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const isP1 = (match.player_one as any)?.id === profile.id
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const opponent = isP1 ? match.player_two as any : match.player_one as any
                  const won = match.winner_id === profile.id
                  const drew = match.status === 'draw'
                  const opponentName = opponent?.username ?? opponent?.full_name ?? 'Unknown'
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const challenge = match.challenge as any

                  return (
                    <Link
                      key={match.id}
                      href={`/match/${match.id}`}
                      className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 hover:bg-muted/30 transition-colors"
                    >
                      <span className={`text-lg ${drew ? 'text-muted-foreground' : won ? 'text-green-400' : 'text-destructive'}`}>
                        {drew ? '=' : won ? '▲' : '▼'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{challenge?.title ?? 'Challenge'}</p>
                        <p className="text-xs text-muted-foreground">vs {opponentName} · {GAME_TYPE_LABELS[match.game_type as keyof typeof GAME_TYPE_LABELS] ?? match.game_type}</p>
                      </div>
                      <span className={`text-xs font-semibold ${drew ? 'text-muted-foreground' : won ? 'text-green-400' : 'text-destructive'}`}>
                        {drew ? 'Draw' : won ? 'Win' : 'Loss'}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize hidden sm:block">{match.mode}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
