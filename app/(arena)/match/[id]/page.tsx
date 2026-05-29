import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { MatchRoom } from './_components/match-room'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Match' }

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: match } = await supabase
    .from('arena_matches')
    .select(`
      *,
      challenge:arena_challenges(*),
      player_one:profiles!arena_matches_player_one_id_fkey(id, username, full_name, arena_elo, arena_rank_tier),
      player_two:profiles!arena_matches_player_two_id_fkey(id, username, full_name, arena_elo, arena_rank_tier)
    `)
    .eq('id', id)
    .single()

  if (!match) notFound()

  // Verify this user is in the match
  if (match.player_one_id !== user!.id && match.player_two_id !== user!.id) {
    redirect('/lobby')
  }

  const { data: submissions } = await supabase
    .from('arena_submissions')
    .select('*')
    .eq('match_id', id)

  return (
    <MatchRoom
      match={match}
      currentUserId={user!.id}
      initialSubmissions={submissions ?? []}
    />
  )
}
