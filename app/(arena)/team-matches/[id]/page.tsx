import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TeamMatchRoom } from './_components/team-match-room'

export const metadata: Metadata = { title: 'Team Match' }

export default async function TeamMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: match } = await supabase
    .from('arena_team_matches')
    .select(`
      *,
      challenge:arena_challenges(*),
      team_one:arena_teams!arena_team_matches_team_one_id_fkey(id, name, tag, slug, avatar_url, team_elo, team_rank_tier),
      team_two:arena_teams!arena_team_matches_team_two_id_fkey(id, name, tag, slug, avatar_url, team_elo, team_rank_tier)
    `)
    .eq('id', id)
    .single()

  if (!match) notFound()

  const { data: players } = await supabase
    .from('arena_team_match_players')
    .select('*, profile:profiles!arena_team_match_players_user_id_fkey(username, full_name, avatar_url, arena_rank_tier)')
    .eq('team_match_id', id)

  // Is user a participant?
  const myPlayer = user ? (players ?? []).find(p => p.user_id === user.id) ?? null : null

  // Is user owner/captain of team_two (can accept challenge)?
  let canAccept = false
  if (user && match.status === 'pending') {
    const { data: role } = await supabase
      .from('arena_team_members')
      .select('role')
      .eq('team_id', match.team_two_id)
      .eq('user_id', user.id)
      .single()
    canAccept = role ? ['owner', 'captain'].includes(role.role) : false
  }

  // Is user a member of either team (can submit)?
  let myTeamId: string | null = null
  if (user) {
    const { data: membership } = await supabase
      .from('arena_team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .in('team_id', [match.team_one_id, match.team_two_id])
      .single()
    myTeamId = membership?.team_id ?? null
  }

  return (
    <TeamMatchRoom
      match={match}
      players={players ?? []}
      myPlayer={myPlayer}
      myTeamId={myTeamId}
      canAccept={canAccept}
      userId={user?.id ?? null}
    />
  )
}
