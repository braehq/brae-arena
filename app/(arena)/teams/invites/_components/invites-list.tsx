'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Shield } from 'lucide-react'
import { RankBadge } from '@/components/arena/rank-badge'
import type { ArenaTeamInvite, RankTier } from '@/types/arena'

export function InvitesList({ invites }: { invites: ArenaTeamInvite[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function respond(invite: ArenaTeamInvite, action: 'accept' | 'decline') {
    setLoading(invite.id + action)
    const team = invite.team as { slug?: string } | null
    const res = await fetch(`/api/arena/teams/${team?.slug}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId: invite.id, action }),
    })
    const data = await res.json()
    if (!res.ok) toast.error(data.error)
    else { toast.success(action === 'accept' ? 'Joined team!' : 'Invite declined'); router.refresh() }
    setLoading(null)
  }

  if (invites.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center">
        <Shield className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No pending invites.</p>
        <Link href="/teams" className="mt-3 inline-block text-sm text-primary hover:underline">Browse teams →</Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {invites.map(invite => {
        const team = invite.team as { name?: string; tag?: string; slug?: string; avatar_url?: string; team_elo?: number; team_rank_tier?: string } | null
        const inviter = invite.inviter as { username?: string; full_name?: string } | null
        return (
          <div key={invite.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3 mb-3">
              {team?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={team.avatar_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  {team?.tag ?? '?'}
                </div>
              )}
              <div className="flex-1">
                <Link href={`/teams/${team?.slug}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                  {team?.name} [{team?.tag}]
                </Link>
                <p className="text-xs text-muted-foreground">Invited by @{inviter?.username ?? inviter?.full_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <RankBadge tier={(team?.team_rank_tier ?? 'bronze') as RankTier} size="sm" />
                <span className="font-mono text-xs text-muted-foreground">{team?.team_elo} ELO</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => respond(invite, 'accept')}
                disabled={!!loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {loading === invite.id + 'accept' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Join Team
              </button>
              <button
                onClick={() => respond(invite, 'decline')}
                disabled={!!loading}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
