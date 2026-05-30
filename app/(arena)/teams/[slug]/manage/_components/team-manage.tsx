'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, UserMinus, UserPlus, Crown, Star } from 'lucide-react'
import type { ArenaTeam, ArenaTeamMember, ArenaTeamInvite, TeamRole } from '@/types/arena'

interface Props {
  team: ArenaTeam
  members: ArenaTeamMember[]
  pendingInvites: ArenaTeamInvite[]
  myRole: TeamRole
  userId: string
}

export function TeamManage({ team, members, pendingInvites, myRole, userId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [inviteUsername, setInviteUsername] = useState('')

  async function invite() {
    if (!inviteUsername.trim()) return
    setLoading('invite')
    const res = await fetch(`/api/arena/teams/${team.slug}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: inviteUsername.trim() }),
    })
    const data = await res.json()
    if (!res.ok) toast.error(data.error)
    else { toast.success(`Invited @${inviteUsername}`); setInviteUsername(''); router.refresh() }
    setLoading(null)
  }

  async function kickMember(targetUserId: string, username: string) {
    if (!confirm(`Kick ${username} from the team?`)) return
    setLoading(targetUserId)
    const res = await fetch(`/api/arena/teams/${team.slug}/leave`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: targetUserId }),
    })
    const data = await res.json()
    if (!res.ok) toast.error(data.error)
    else { toast.success(`${username} removed`); router.refresh() }
    setLoading(null)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-2">
        <Link href={`/teams/${team.slug}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← {team.name}</Link>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Manage Team</h1>

      {/* Invite */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold text-foreground">Invite Player</h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
            <input
              value={inviteUsername}
              onChange={e => setInviteUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && invite()}
              placeholder="username"
              className="w-full pl-7 pr-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>
          <button
            onClick={invite}
            disabled={loading === 'invite' || !inviteUsername.trim()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading === 'invite' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Invite
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{members.length}/{team.max_members} members</p>
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-foreground">Pending Invites</h2>
          </div>
          <div className="divide-y divide-border">
            {pendingInvites.map(invite => {
              const invitee = (invite as unknown as { invitee?: { username?: string; full_name?: string } }).invitee ?? null
              return (
                <div key={invite.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-foreground">@{invitee?.username ?? invitee?.full_name}</span>
                  <span className="text-xs text-amber-400">Pending</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Members */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-foreground">Members</h2>
        </div>
        <div className="divide-y divide-border">
          {members.map(m => {
            const profile = m.profile as { username?: string; full_name?: string; avatar_url?: string } | null
            const isMe = m.user_id === userId
            const canKick = myRole === 'owner' && !isMe && m.role !== 'owner'
            const name = profile?.username ?? profile?.full_name ?? 'Player'

            return (
              <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    {name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 flex items-center gap-1.5">
                  <span className="text-sm font-medium text-foreground">{name}</span>
                  {isMe && <span className="text-xs text-muted-foreground">(you)</span>}
                  {m.role === 'owner' && <Crown className="h-3.5 w-3.5 text-yellow-400" />}
                  {m.role === 'captain' && <Star className="h-3.5 w-3.5 text-primary" />}
                </div>
                <span className="text-xs text-muted-foreground capitalize">{m.role}</span>
                {canKick && (
                  <button
                    onClick={() => kickMember(m.user_id, name)}
                    disabled={loading === m.user_id}
                    className="rounded-md p-1 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  >
                    {loading === m.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
