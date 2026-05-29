import { createClient } from '@/lib/supabase/server'
import { LobbyClient } from './_components/lobby-client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Lobby' }

export default async function LobbyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileResult, queueCountResult, topPlayersResult] = await Promise.all([
    supabase.from('profiles')
      .select('id, username, full_name, arena_elo, arena_rank_tier, arena_wins, arena_losses, arena_streak, arena_matches_played, total_xp')
      .eq('id', user!.id)
      .single(),
    supabase.from('arena_queue').select('id', { count: 'exact', head: true }).eq('status', 'waiting'),
    supabase.from('profiles')
      .select('id, username, full_name, arena_elo, arena_rank_tier, arena_wins, arena_losses')
      .order('arena_elo', { ascending: false })
      .limit(5),
  ])

  return (
    <LobbyClient
      profile={profileResult.data}
      queueCount={queueCountResult.count ?? 0}
      topPlayers={topPlayersResult.data ?? []}
    />
  )
}
