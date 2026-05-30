import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TeamProfile } from './_components/team-profile'

export const metadata: Metadata = { title: 'Team' }

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: team } = await supabase
    .from('arena_teams')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!team) notFound()

  const [{ data: members }, { data: recentMatches }] = await Promise.all([
    supabase
      .from('arena_team_members')
      .select('*, profile:profiles!arena_team_members_user_id_fkey(username, full_name, avatar_url, arena_elo, arena_rank_tier, country)')
      .eq('team_id', team.id)
      .order('joined_at', { ascending: true }),
    supabase
      .from('arena_team_matches')
      .select(`
        *,
        challenge:arena_challenges(title, game_type),
        team_one:arena_teams!arena_team_matches_team_one_id_fkey(id, name, tag, slug, team_elo, team_rank_tier),
        team_two:arena_teams!arena_team_matches_team_two_id_fkey(id, name, tag, slug, team_elo, team_rank_tier)
      `)
      .or(`team_one_id.eq.${team.id},team_two_id.eq.${team.id}`)
      .in('status', ['complete', 'draw', 'active', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const myMembership = user
    ? (members ?? []).find(m => m.user_id === user.id) ?? null
    : null

  // Pending invite for this user to this team
  let pendingInvite = null
  if (user && !myMembership) {
    const { data } = await supabase
      .from('arena_team_invites')
      .select('id')
      .eq('team_id', team.id)
      .eq('invitee_id', user.id)
      .eq('status', 'pending')
      .single()
    pendingInvite = data
  }

  return (
    <TeamProfile
      team={team}
      members={members ?? []}
      recentMatches={recentMatches ?? []}
      myMembership={myMembership}
      pendingInvite={pendingInvite}
      userId={user?.id ?? null}
    />
  )
}
