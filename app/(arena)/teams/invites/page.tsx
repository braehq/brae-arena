import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InvitesList } from './_components/invites-list'

export const metadata: Metadata = { title: 'Team Invites' }

export default async function InvitesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: invites } = await supabase
    .from('arena_team_invites')
    .select(`
      *,
      team:arena_teams!arena_team_invites_team_id_fkey(id, name, tag, slug, avatar_url, team_elo, team_rank_tier),
      inviter:profiles!arena_team_invites_invited_by_fkey(username, full_name)
    `)
    .eq('invitee_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Team Invites</h1>
      <InvitesList invites={invites ?? []} />
    </div>
  )
}
