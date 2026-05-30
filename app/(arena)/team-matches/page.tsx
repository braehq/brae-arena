import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Shield, Swords } from 'lucide-react'
import { RankBadge } from '@/components/arena/rank-badge'
import type { RankTier } from '@/types/arena'

export const metadata: Metadata = { title: 'Team Matches' }

export default async function TeamMatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: matches }, myTeam] = await Promise.all([
    supabase
      .from('arena_team_matches')
      .select(`
        *,
        challenge:arena_challenges(title, game_type, time_limit_mins),
        team_one:arena_teams!arena_team_matches_team_one_id_fkey(id, name, tag, slug, avatar_url, team_elo, team_rank_tier),
        team_two:arena_teams!arena_team_matches_team_two_id_fkey(id, name, tag, slug, avatar_url, team_elo, team_rank_tier)
      `)
      .not('status', 'in', '("cancelled")')
      .order('created_at', { ascending: false })
      .limit(30),
    user ? supabase
      .from('arena_team_members')
      .select('team:arena_teams(id, name, tag, slug)')
      .eq('user_id', user.id)
      .single()
      .then(r => r.data)
      : Promise.resolve(null),
  ])

  const myTeamData = (myTeam?.team as { id?: string; name?: string; tag?: string; slug?: string } | null) ?? null

  const STATUS_STYLE: Record<string, string> = {
    pending:  'text-amber-400 border-amber-500/40 bg-amber-500/10',
    accepted: 'text-blue-400 border-blue-500/40 bg-blue-500/10',
    active:   'text-green-400 border-green-500/40 bg-green-500/10',
    scoring:  'text-primary border-primary/40 bg-primary/10',
    complete: 'text-muted-foreground border-border',
    draw:     'text-muted-foreground border-border',
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Matches</h1>
          <p className="mt-1 text-sm text-muted-foreground">Challenge other teams to 2v2 or 3v3 battles.</p>
        </div>
        {myTeamData && (
          <Link href={`/team-matches/challenge`} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            <Swords className="h-4 w-4" /> Challenge a Team
          </Link>
        )}
      </div>

      {(!matches || matches.length === 0) ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Shield className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No team matches yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map(m => {
            const t1 = m.team_one as { name?: string; tag?: string; slug?: string; team_elo?: number; team_rank_tier?: string } | null
            const t2 = m.team_two as { name?: string; tag?: string; slug?: string; team_elo?: number; team_rank_tier?: string } | null
            const challenge = m.challenge as { title?: string; game_type?: string } | null
            const statusStyle = STATUS_STYLE[m.status] ?? STATUS_STYLE.complete

            return (
              <Link key={m.id} href={`/team-matches/${m.id}`} className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/40 transition-colors">
                {/* Teams */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span>[{t1?.tag}] {t1?.name}</span>
                    <span className="text-muted-foreground text-xs">vs</span>
                    <span>[{t2?.tag}] {t2?.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{challenge?.title} · {m.format} · {m.status === 'pending' ? 'Challenge pending' : ''}</p>
                </div>

                {/* Scores */}
                {m.status === 'complete' && m.team_one_score != null && (
                  <span className="font-mono text-sm font-semibold text-foreground">{m.team_one_score} – {m.team_two_score}</span>
                )}

                {/* ELO */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RankBadge tier={(t1?.team_rank_tier ?? 'bronze') as RankTier} size="sm" />
                  <span>{t1?.team_elo}</span>
                  <span>·</span>
                  <span>{t2?.team_elo}</span>
                  <RankBadge tier={(t2?.team_rank_tier ?? 'bronze') as RankTier} size="sm" />
                </div>

                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${statusStyle}`}>
                  {m.status === 'active' ? 'Live' : m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
