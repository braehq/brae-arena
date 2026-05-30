import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RankBadge } from '@/components/arena/rank-badge'
import type { RankTier } from '@/types/arena'

export const metadata: Metadata = { title: 'Season Rankings' }

export default async function SeasonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: season } = await supabase
    .from('arena_seasons')
    .select('*')
    .eq('id', id)
    .single()

  if (!season) notFound()

  const { data: rankings } = await supabase
    .from('arena_season_rankings')
    .select('*, profile:profiles!arena_season_rankings_user_id_fkey(username, full_name, avatar_url, country)')
    .eq('season_id', id)
    .order('rank_position', { ascending: true })
    .limit(100)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-2">
        <Link href="/seasons" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Seasons</Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{season.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(season.starts_at).toLocaleDateString()} — {new Date(season.ends_at).toLocaleDateString()}
          </p>
        </div>
        {season.is_active && (
          <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">LIVE</span>
        )}
      </div>

      {rankings && rankings.length > 0 ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="divide-y divide-border">
            {rankings.map((r) => {
              const profile = r.profile as { username: string | null; full_name: string | null; avatar_url: string | null; country: string | null } | null
              return (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`w-7 text-center font-mono text-sm font-bold ${
                    r.rank_position === 1 ? 'text-yellow-400' :
                    r.rank_position === 2 ? 'text-slate-300' :
                    r.rank_position === 3 ? 'text-amber-600' : 'text-muted-foreground'
                  }`}>#{r.rank_position}</span>

                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {(profile?.username ?? profile?.full_name ?? '?').slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/profile/${profile?.username ?? ''}`}
                      className="truncate text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {profile?.username ?? profile?.full_name ?? 'Unknown'}
                    </Link>
                    <p className="text-xs text-muted-foreground">{r.wins}W – {r.losses}L</p>
                  </div>

                  <RankBadge tier={r.final_tier as RankTier} size="sm" />
                  <span className="font-mono text-sm font-semibold text-foreground w-14 text-right">{r.final_elo}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            {season.is_active ? 'Rankings will be finalised when the season ends.' : 'No rankings recorded for this season.'}
          </p>
        </div>
      )}
    </div>
  )
}
