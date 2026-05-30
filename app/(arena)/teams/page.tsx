import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { RankBadge } from '@/components/arena/rank-badge'
import { Users, Shield, Trophy } from 'lucide-react'
import type { RankTier } from '@/types/arena'

export const metadata: Metadata = { title: 'Teams' }

export default async function TeamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: teams } = await supabase
    .from('arena_teams')
    .select('*, members:arena_team_members(count)')
    .order('team_elo', { ascending: false })
    .limit(50)

  // Is the user in a team?
  let myTeamSlug: string | null = null
  if (user) {
    const { data: membership } = await supabase
      .from('arena_team_members')
      .select('team:arena_teams(slug)')
      .eq('user_id', user.id)
      .single()
    myTeamSlug = (membership?.team as { slug?: string } | null)?.slug ?? null
  }

  // Pending invites count
  let pendingInvites = 0
  if (user) {
    const { count } = await supabase
      .from('arena_team_invites')
      .select('id', { count: 'exact', head: true })
      .eq('invitee_id', user.id)
      .eq('status', 'pending')
    pendingInvites = count ?? 0
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teams</h1>
          <p className="mt-1 text-sm text-muted-foreground">Compete together. 2v2 and 3v3 team battles with shared ELO.</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingInvites > 0 && (
            <Link href="/teams/invites" className="flex items-center gap-1.5 rounded-lg border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
              {pendingInvites} invite{pendingInvites > 1 ? 's' : ''}
            </Link>
          )}
          {user && !myTeamSlug && (
            <Link href="/teams/create" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
              Create Team
            </Link>
          )}
          {myTeamSlug && (
            <Link href={`/teams/${myTeamSlug}`} className="rounded-lg border border-primary/50 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors">
              My Team
            </Link>
          )}
        </div>
      </div>

      {(!teams || teams.length === 0) ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Shield className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">No teams yet. Be the first to create one.</p>
          {user && !myTeamSlug && (
            <Link href="/teams/create" className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              Create Team
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="divide-y divide-border">
            {teams.map((team, i) => {
              const memberCount = (team.members as { count: number }[])?.[0]?.count ?? 0
              return (
                <Link
                  key={team.id}
                  href={`/teams/${team.slug}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/30 transition-colors"
                >
                  <span className={`w-8 text-center font-mono text-sm font-bold ${
                    i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-muted-foreground'
                  }`}>#{i + 1}</span>

                  {team.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={team.avatar_url} alt="" className="h-9 w-9 rounded-lg object-cover" />
                  ) : (
                    <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {team.tag}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{team.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">[{team.tag}]</span>
                      {team.is_open && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400">Open</span>}
                    </div>
                    {team.description && <p className="text-xs text-muted-foreground truncate">{team.description}</p>}
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Users className="h-3.5 w-3.5" />{memberCount}/{team.max_members}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Trophy className="h-3.5 w-3.5" />{team.team_wins}W
                    </span>
                    <RankBadge tier={team.team_rank_tier as RankTier} size="sm" />
                    <span className="font-mono text-sm font-semibold text-foreground w-14 text-right">{team.team_elo}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
