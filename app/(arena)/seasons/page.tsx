import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { RankBadge } from '@/components/arena/rank-badge'
import type { RankTier } from '@/types/arena'

export const metadata: Metadata = { title: 'Seasons' }

export default async function SeasonsPage() {
  const supabase = await createClient()

  const [{ data: seasons }, { data: activeSeason }] = await Promise.all([
    supabase.from('arena_seasons').select('*').order('number', { ascending: false }),
    supabase.from('arena_seasons').select('*').eq('is_active', true).single(),
  ])

  // Current season top 10
  let topRankings: {
    rank_position: number
    final_elo: number
    final_tier: string
    profile: { username: string | null; full_name: string | null; avatar_url: string | null } | null
  }[] = []
  if (activeSeason) {
    const { data } = await supabase
      .from('profiles')
      .select('username, full_name, avatar_url, arena_elo, arena_rank_tier')
      .order('arena_elo', { ascending: false })
      .limit(10)

    topRankings = (data ?? []).map((p, i) => ({
      rank_position: i + 1,
      final_elo: p.arena_elo,
      final_tier: p.arena_rank_tier,
      profile: { username: p.username, full_name: p.full_name, avatar_url: p.avatar_url },
    }))
  }

  const now = new Date()
  const daysLeft = activeSeason
    ? Math.max(0, Math.ceil((new Date(activeSeason.ends_at).getTime() - now.getTime()) / 86400000))
    : 0

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Seasons</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ranked seasons reset ELO every 4 weeks. Your peak rank is saved forever.</p>
      </div>

      {/* Active season banner */}
      {activeSeason && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/10 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">LIVE</span>
                <h2 className="font-semibold text-foreground">{activeSeason.name}</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {new Date(activeSeason.starts_at).toLocaleDateString()} — {new Date(activeSeason.ends_at).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{daysLeft}</p>
              <p className="text-xs text-muted-foreground">days left</p>
            </div>
          </div>
        </div>
      )}

      {/* Current standings */}
      {topRankings.length > 0 && (
        <div className="mb-8 rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-semibold text-foreground">Current Season Standings</h2>
          </div>
          <div className="divide-y divide-border">
            {topRankings.map((r) => (
              <div key={r.rank_position} className="flex items-center gap-3 px-4 py-3">
                <span className={`w-7 text-center font-mono text-sm font-bold ${
                  r.rank_position === 1 ? 'text-yellow-400' :
                  r.rank_position === 2 ? 'text-slate-300' :
                  r.rank_position === 3 ? 'text-amber-600' : 'text-muted-foreground'
                }`}>#{r.rank_position}</span>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/profile/${r.profile?.username ?? ''}`}
                    className="truncate text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {r.profile?.username ?? r.profile?.full_name ?? 'Unknown'}
                  </Link>
                </div>
                <RankBadge tier={r.final_tier as RankTier} size="sm" />
                <span className="font-mono text-sm font-semibold text-foreground w-14 text-right">{r.final_elo}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border px-4 py-3">
            <Link href="/leaderboard" className="text-sm text-primary hover:underline">View full leaderboard →</Link>
          </div>
        </div>
      )}

      {/* Past seasons */}
      {(seasons ?? []).filter(s => !s.is_active).length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold text-foreground">Past Seasons</h2>
          <div className="space-y-2">
            {(seasons ?? []).filter(s => !s.is_active).map(season => (
              <Link
                key={season.id}
                href={`/seasons/${season.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/50 transition-colors"
              >
                <div>
                  <p className="font-medium text-foreground">{season.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(season.starts_at).toLocaleDateString()} — {new Date(season.ends_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">View rankings →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {(!seasons || seasons.length === 0) && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No seasons yet. Season 1 starts soon.</p>
        </div>
      )}
    </div>
  )
}
