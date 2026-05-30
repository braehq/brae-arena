import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TeamManage } from './_components/team-manage'

export const metadata: Metadata = { title: 'Manage Team' }

export default async function ManageTeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: team } = await supabase.from('arena_teams').select('*').eq('slug', slug).single()
  if (!team) notFound()

  const { data: membership } = await supabase
    .from('arena_team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'captain'].includes(membership.role)) redirect(`/teams/${slug}`)

  const { data: members } = await supabase
    .from('arena_team_members')
    .select('*, profile:profiles!arena_team_members_user_id_fkey(username, full_name, avatar_url, arena_elo, arena_rank_tier)')
    .eq('team_id', team.id)

  const { data: pendingInvites } = await supabase
    .from('arena_team_invites')
    .select('*, invitee:profiles!arena_team_invites_invitee_id_fkey(username, full_name, avatar_url)')
    .eq('team_id', team.id)
    .eq('status', 'pending')

  return (
    <TeamManage
      team={team}
      members={members ?? []}
      pendingInvites={pendingInvites ?? []}
      myRole={membership.role as 'owner' | 'captain'}
      userId={user.id}
    />
  )
}
