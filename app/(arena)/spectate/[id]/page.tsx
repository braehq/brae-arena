import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SpectateRoom } from './_components/spectate-room'

export const metadata: Metadata = { title: 'Spectating' }

export default async function SpectatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: match } = await supabase
    .from('arena_matches')
    .select(`
      *,
      challenge:arena_challenges(*),
      player_one:profiles!arena_matches_player_one_id_fkey(id, username, full_name, avatar_url, arena_elo, arena_rank_tier),
      player_two:profiles!arena_matches_player_two_id_fkey(id, username, full_name, avatar_url, arena_elo, arena_rank_tier)
    `)
    .eq('id', id)
    .single()

  if (!match) notFound()

  // If the viewer IS a player in this match, redirect to the match room
  if (user && (user.id === match.player_one_id || user.id === match.player_two_id)) {
    redirect(`/match/${id}`)
  }

  // Only active or scoring matches can be spectated
  if (!['active', 'scoring', 'complete'].includes(match.status)) {
    redirect('/leaderboard')
  }

  // Log spectator join (best-effort, no auth required for viewing)
  if (user) {
    await supabase.from('arena_spectators').upsert(
      { match_id: id, user_id: user.id, joined_at: new Date().toISOString(), left_at: null },
      { onConflict: 'match_id,user_id' }
    )
  }

  // Spectator count
  const { count: spectatorCount } = await supabase
    .from('arena_spectators')
    .select('id', { count: 'exact', head: true })
    .eq('match_id', id)
    .is('left_at', null)

  // Submissions (if match is complete, show scores)
  const { data: submissions } = await supabase
    .from('arena_submissions')
    .select('*')
    .eq('match_id', id)

  return (
    <SpectateRoom
      match={match}
      submissions={submissions ?? []}
      spectatorCount={spectatorCount ?? 0}
      userId={user?.id ?? null}
    />
  )
}
