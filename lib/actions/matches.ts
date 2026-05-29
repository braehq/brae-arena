'use server'

import { createClient } from '@/lib/supabase/server'

export async function getMatch(matchId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('arena_matches')
    .select(`
      *,
      challenge:arena_challenges(*),
      player_one:profiles!arena_matches_player_one_id_fkey(id, username, full_name, avatar_url, arena_elo, arena_rank_tier),
      player_two:profiles!arena_matches_player_two_id_fkey(id, username, full_name, avatar_url, arena_elo, arena_rank_tier)
    `)
    .eq('id', matchId)
    .single()

  return data
}

export async function getMatchSubmissions(matchId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('arena_submissions')
    .select('*')
    .eq('match_id', matchId)

  return data ?? []
}

export async function getMatchHistory(limit = 20) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('arena_matches')
    .select(`
      *,
      challenge:arena_challenges(title, mode, difficulty),
      player_one:profiles!arena_matches_player_one_id_fkey(id, username, full_name, arena_rank_tier),
      player_two:profiles!arena_matches_player_two_id_fkey(id, username, full_name, arena_rank_tier)
    `)
    .or(`player_one_id.eq.${user.id},player_two_id.eq.${user.id}`)
    .eq('status', 'complete')
    .order('created_at', { ascending: false })
    .limit(limit)

  return data ?? []
}
