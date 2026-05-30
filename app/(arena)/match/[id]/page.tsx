import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { MatchRoom } from './_components/match-room'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Match' }

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Auth check with user client (respects RLS)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch match data with service client — profiles RLS would block reading
  // the opponent's row with the regular client
  const service = createServiceClient()

  const { data: match, error: matchError } = await service
    .from('arena_matches')
    .select(`
      *,
      challenge:arena_challenges(*),
      player_one:profiles!arena_matches_player_one_id_fkey(id, username, full_name, arena_elo, arena_rank_tier),
      player_two:profiles!arena_matches_player_two_id_fkey(id, username, full_name, arena_elo, arena_rank_tier)
    `)
    .eq('id', id)
    .single()

  if (matchError || !match) {
    console.error('[match page] query failed:', matchError?.message, matchError?.code, 'id:', id, 'svcKeySet:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    notFound()
  }

  // Verify this user is in the match
  if (match.player_one_id !== user.id && match.player_two_id !== user.id) {
    redirect('/lobby')
  }

  const { data: submissions } = await service
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
