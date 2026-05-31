import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { SpectateRoom } from './_components/spectate-room'

export const metadata: Metadata = { title: 'Spectating' }

export default async function SpectatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()

  const { data: rawMatch } = await service.from('arena_matches').select('*').eq('id', id).single()

  if (!rawMatch) notFound()

  const [{ data: challengeRow }, { data: p1 }, { data: p2 }] = await Promise.all([
    service.from('arena_challenges').select('*').eq('id', rawMatch.challenge_id).single(),
    service.from('profiles').select('id, username, full_name, avatar_url, arena_elo, arena_rank_tier').eq('id', rawMatch.player_one_id).single(),
    service.from('profiles').select('id, username, full_name, avatar_url, arena_elo, arena_rank_tier').eq('id', rawMatch.player_two_id).single(),
  ])

  const match = { ...rawMatch, challenge: challengeRow, player_one: p1, player_two: p2 }

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
    await service.from('arena_spectators').upsert(
      { match_id: id, user_id: user.id, joined_at: new Date().toISOString(), left_at: null },
      { onConflict: 'match_id,user_id' }
    )
  }

  // Spectator count
  const { count: spectatorCount } = await service
    .from('arena_spectators')
    .select('id', { count: 'exact', head: true })
    .eq('match_id', id)
    .is('left_at', null)

  // Submissions (if match is complete, show scores)
  const { data: submissions } = await service
    .from('arena_submissions')
    .select('*')
    .eq('match_id', id)

  // Load initial chat messages
  const { data: chatMessages } = await service
    .from('arena_match_chat')
    .select('id, user_id, message, created_at')
    .eq('match_id', id)
    .order('created_at', { ascending: true })
    .limit(100)

  // Enrich chat with profiles
  const chatUserIds = [...new Set((chatMessages ?? []).map(m => m.user_id))]
  const { data: chatProfiles } = chatUserIds.length > 0
    ? await service.from('profiles').select('id, username, full_name, country, arena_rank_tier').in('id', chatUserIds)
    : { data: [] }
  const chatProfileMap = Object.fromEntries((chatProfiles ?? []).map(p => [p.id, p]))
  const enrichedChat = (chatMessages ?? []).map(m => ({ ...m, profile: chatProfileMap[m.user_id] ?? undefined }))

  return (
    <SpectateRoom
      match={match}
      submissions={submissions ?? []}
      spectatorCount={spectatorCount ?? 0}
      userId={user?.id ?? null}
      initialChat={enrichedChat}
    />
  )
}
