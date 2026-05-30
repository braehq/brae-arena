'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trophy, Users, Shield, Crown, Star, Loader2 } from 'lucide-react'
import { RankBadge } from '@/components/arena/rank-badge'
import type { ArenaTeam, ArenaTeamMember, ArenaTeamMatch, RankTier } from '@/types/arena'

interface Props {
  team: ArenaTeam
  members: ArenaTeamMember[]
  recentMatches: ArenaTeamMatch[]
  myMembership: ArenaTeamMember | null
  pendingInvite: { id: string } | null
  userId: string | null
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner:   <Crown className="h-3.5 w-3.5 text-yellow-400" />,
  captain: <Star className="h-3.5 w-3.5 text-primary" />,
  member:  null,
}

export function TeamProfile({ team, members, recentMatches, myMembership, pendingInvite, userId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const isOwner = myMembership?.role === 'owner'
  const isCaptain = myMembership?.role === 'captain'
  const canManage = isOwner || isCaptain

  async function respondToInvite(action: 'accept' | 'decline') {
    if (!pendingInvite) return
    setLoading(true)
    const res = await fetch(`/api/arena/teams/${team.slug}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId: pendingInvite.id, action }),
    })
    const data = await res.json()
    if (!res.ok) toast.error(data.error)
    else { toast.success(action === 'accept' ? 'Joined team!' : 'Invite declined'); router.refresh() }
    setLoading(false)
  }

  async function leaveTeam() {
    if (!confirm('Leave this team?')) return
    setLoading(true)
    const res = await fetch(`/api/arena/teams/${team.slug}/leave`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    const data = await res.json()
    if (!res.ok) toast.error(data.error)
    else { toast.success('Left team'); router.push('/teams') }
    setLoading(false)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-2">
        <Link href="/teams" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Teams</Link>
      </div>

      {/* Team header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {team.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.avatar_url} alt="" className="h-16 w-16 rounded-xl object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
              {team.tag}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
              <span className="font-mono text-sm text-muted-foreground">[{team.tag}]</span>
              {team.is_open && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400">Open</span>}
            </div>
            {team.description && <p className="mt-1 text-sm text-muted-foreground">{team.description}</p>}
            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="h-4 w-4" />{members.length}/{team.max_members}</span>
              <span className="flex items-center gap-1"><Trophy className="h-4 w-4" />{team.team_wins}W – {team.team_losses}L</span>
              <RankBadge tier={team.team_rank_tier as RankTier} size="sm" />
              <span className="font-mono font-semibold text-foreground">{team.team_elo} ELO</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          {pendingInvite && (
            <div className="flex gap-2">
              <button onClick={() => respondToInvite('accept')} disabled={loading} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50">
                {loading && <Loader2 className="h-3 w-3 animate-spin" />} Accept Invite
              </button>
              <button onClick={() => respondToInvite('decline')} disabled={loading} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Decline</button>
            </div>
          )}
          {canManage && (
            <Link href={`/teams/${team.slug}/manage`} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors">
              Manage
            </Link>
          )}
          {myMembership && !isOwner && (
            <button onClick={leaveTeam} disabled={loading} className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors">
              Leave
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Members */}
        <div>
          <h2 className="mb-3 font-semibold text-foreground">Members</h2>
          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {members.map((m) => {
              const profile = m.profile as { username?: string; full_name?: string; avatar_url?: string; arena_elo?: number; arena_rank_tier?: string; country?: string } | null
              return (
                <div key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                      {(profile?.username ?? '?').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      {ROLE_ICONS[m.role]}
                      <Link href={`/profile/${profile?.username ?? m.user_id}`} className="truncate text-sm font-medium text-foreground hover:text-primary transition-colors">
                        {profile?.username ?? profile?.full_name ?? 'Player'}
                      </Link>
                    </div>
                  </div>
                  <RankBadge tier={(profile?.arena_rank_tier ?? 'bronze') as RankTier} size="sm" />
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent matches */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 font-semibold text-foreground">Recent Matches</h2>
          {recentMatches.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Shield className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No matches yet. Challenge another team!</p>
              {canManage && (
                <Link href="/team-matches" className="mt-3 inline-block text-sm text-primary hover:underline">Find opponents →</Link>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
              {recentMatches.map((m) => {
                const isTeamOne = m.team_one_id === team.id
                const myScore = isTeamOne ? m.team_one_score : m.team_two_score
                const oppScore = isTeamOne ? m.team_two_score : m.team_one_score
                const opponent = (isTeamOne ? m.team_two : m.team_one) as { name?: string; tag?: string; slug?: string } | null
                const won = m.winner_team_id === team.id
                const lost = m.winner_team_id && m.winner_team_id !== team.id
                const eloChange = isTeamOne ? m.elo_change_t1 : m.elo_change_t2
                const challenge = m.challenge as { title?: string } | null

                return (
                  <Link key={m.id} href={`/team-matches/${m.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${won ? 'bg-green-400' : lost ? 'bg-red-400' : 'bg-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        vs [{opponent?.tag}] {opponent?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{challenge?.title}</p>
                    </div>
                    {myScore != null && oppScore != null && (
                      <span className={`text-sm font-semibold ${won ? 'text-green-400' : lost ? 'text-red-400' : 'text-muted-foreground'}`}>
                        {myScore} – {oppScore}
                      </span>
                    )}
                    {eloChange != null && m.status === 'complete' && (
                      <span className={`text-xs font-semibold w-10 text-right ${eloChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {eloChange >= 0 ? '+' : ''}{eloChange}
                      </span>
                    )}
                    {m.status === 'active' && <span className="text-xs font-semibold text-primary">LIVE</span>}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
