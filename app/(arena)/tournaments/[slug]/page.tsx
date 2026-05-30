import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TournamentView } from './_components/tournament-view'

export const metadata: Metadata = { title: 'Tournament' }

export default async function TournamentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tournament } = await supabase
    .from('arena_tournaments')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!tournament) notFound()

  const [{ data: participants }, { data: bracketMatches }] = await Promise.all([
    supabase
      .from('arena_tournament_participants')
      .select('*, profile:profiles!arena_tournament_participants_user_id_fkey(username, full_name, avatar_url, arena_elo, arena_rank_tier)')
      .eq('tournament_id', tournament.id)
      .order('seed', { ascending: true }),
    supabase
      .from('arena_tournament_matches')
      .select('*, player_one:profiles!arena_tournament_matches_player_one_id_fkey(username, full_name, avatar_url, arena_rank_tier), player_two:profiles!arena_tournament_matches_player_two_id_fkey(username, full_name, avatar_url, arena_rank_tier)')
      .eq('tournament_id', tournament.id)
      .order('round', { ascending: true })
      .order('bracket_slot', { ascending: true }),
  ])

  const isRegistered = user
    ? (participants ?? []).some(p => p.user_id === user.id)
    : false

  const userProfile = user ? await supabase
    .from('profiles')
    .select('arena_elo')
    .eq('id', user.id)
    .single()
    .then(r => r.data)
    : null

  return (
    <TournamentView
      tournament={tournament}
      participants={participants ?? []}
      bracketMatches={bracketMatches ?? []}
      isRegistered={isRegistered}
      userId={user?.id ?? null}
      userElo={userProfile?.arena_elo ?? 0}
    />
  )
}
