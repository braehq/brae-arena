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

  const [{ data: match }, { data: challenge }] = await Promise.all([
    service.from('arena_matches').select('*').eq('id', id).single(),
    service.from('arena_matches').select('challenge:arena_challenges(*)').eq('id', id).single(),
  ])

  if (!match) {
    console.error('[match page] match not found, id:', id)
    notFound()
  }

  // Verify this user is in the match
  if (match.player_one_id !== user.id && match.player_two_id !== user.id) {
    redirect('/lobby')
  }

  // Fetch profiles and submissions separately (no cross-schema FK join)
  const [{ data: p1Profile }, { data: p2Profile }, { data: submissions }] = await Promise.all([
    service.from('profiles').select('id, username, full_name, arena_elo, arena_rank_tier').eq('id', match.player_one_id).single(),
    service.from('profiles').select('id, username, full_name, arena_elo, arena_rank_tier').eq('id', match.player_two_id).single(),
    service.from('arena_submissions').select('*').eq('match_id', id),
  ])

  const matchWithProfiles = {
    ...match,
    challenge: (challenge as { challenge?: unknown } | null)?.challenge ?? null,
    player_one: p1Profile,
    player_two: p2Profile,
  }

  return (
    <MatchRoom
      match={matchWithProfiles}
      currentUserId={user!.id}
      initialSubmissions={submissions ?? []}
    />
  )
}
