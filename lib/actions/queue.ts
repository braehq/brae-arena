'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { GameMode, GameType, QueueGameType } from '@/types/arena'
import { sendMatchFound } from '@/lib/email/send'

export async function joinQueue(mode: GameMode, gameType: QueueGameType) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('arena_elo')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found' }

  // Upsert — in case of stale entry
  const { error } = await supabase
    .from('arena_queue')
    .upsert({
      user_id: user.id,
      mode,
      game_type: gameType,
      elo: profile.arena_elo,
      status: 'waiting',
      match_id: null,
      joined_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) return { error: error.message }

  // Attempt matchmaking immediately
  await attemptMatchmaking(user.id, mode, gameType, profile.arena_elo)

  return { success: true }
}

export async function leaveQueue() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase
    .from('arena_queue')
    .update({ status: 'cancelled' })
    .eq('user_id', user.id)
    .eq('status', 'waiting')

  return { success: true }
}

export async function getQueueEntry() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('arena_queue')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return data
}

async function attemptMatchmaking(
  userId: string,
  mode: GameMode,
  gameType: QueueGameType,
  elo: number
) {
  const service = createServiceClient()

  const eloRange = 200
  // 'any' game_type matches with anyone — build opponent query accordingly
  // Build game_type filter: 'any' matches everyone, specific type matches that type OR anyone who queued 'any'
  const gameTypeFilter = gameType === 'any'
    ? ['speed_build', 'clone_battle', 'bug_hunt', 'any']
    : [gameType as string, 'any']

  const { data: opponents, error: opponentError } = await service
    .from('arena_queue')
    .select('*')
    .eq('mode', mode)
    .eq('status', 'waiting')
    .neq('user_id', userId)
    .in('game_type', gameTypeFilter)
    .gte('elo', elo - eloRange)
    .lte('elo', elo + eloRange)
    .order('joined_at', { ascending: true })
    .limit(1)

  if (opponentError) {
    console.error('[matchmaking] opponent query failed:', opponentError.message)
    return
  }
  if (!opponents || opponents.length === 0) return

  const opponent = opponents[0]

  // Resolve actual game_type for the match (handle 'any')
  const resolvedGameType = gameType === 'any'
    ? (opponent.game_type === 'any' ? (['speed_build', 'clone_battle', 'bug_hunt'] as const)[Math.floor(Math.random() * 3)] : opponent.game_type)
    : gameType

  const { data: challenges, error: challengeError } = await service
    .from('arena_challenges')
    .select('id, time_limit_mins')
    .eq('mode', resolvedGameType)
    .eq('active', true)

  if (challengeError) {
    console.error('[matchmaking] challenge query failed:', challengeError.message)
    return
  }
  if (!challenges || challenges.length === 0) {
    console.error('[matchmaking] no active challenges for game_type:', resolvedGameType)
    return
  }

  const challenge = challenges[Math.floor(Math.random() * challenges.length)]

  const now = new Date()
  const endsAt = new Date(now.getTime() + challenge.time_limit_mins * 60 * 1000)

  const { data: match, error: matchError } = await service
    .from('arena_matches')
    .insert({
      challenge_id: challenge.id,
      player_one_id: userId,
      player_two_id: opponent.user_id,
      mode,
      game_type: gameType,
      status: 'active',
      started_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .select('id')
    .single()

  if (matchError || !match) {
    console.error('[matchmaking] match insert failed:', matchError?.message)
    return
  }

  // Update both queue entries to matched
  const { error: updateError } = await service
    .from('arena_queue')
    .update({ status: 'matched', match_id: match.id })
    .in('user_id', [userId, opponent.user_id])

  if (updateError) {
    console.error('[matchmaking] queue update failed:', updateError.message)
    return
  }

  // Fetch both players' emails via admin API (fire-and-forget)
  const { data: p1Auth } = await service.auth.admin.getUserById(userId)
  const { data: p2Auth } = await service.auth.admin.getUserById(opponent.user_id)

  const { data: p1Profile } = await service.from('profiles').select('username, full_name').eq('id', userId).single()
  const { data: p2Profile } = await service.from('profiles').select('username, full_name').eq('id', opponent.user_id).single()

  const { data: challengeData } = await service.from('arena_challenges').select('title, time_limit_mins').eq('id', challenge.id).single()

  const p1Name = p1Profile?.username ?? p1Profile?.full_name ?? 'Player'
  const p2Name = p2Profile?.username ?? p2Profile?.full_name ?? 'Opponent'

  if (p1Auth?.user?.email && challengeData) {
    sendMatchFound(p1Auth.user.email, {
      playerName: p1Name,
      opponentName: p2Name,
      opponentElo: opponent.elo,
      challengeTitle: challengeData.title,
      gameType: resolvedGameType,
      mode,
      timeLimitMins: challengeData.time_limit_mins,
      matchId: match.id,
    }).catch(() => {})
  }

  if (p2Auth?.user?.email && challengeData) {
    sendMatchFound(p2Auth.user.email, {
      playerName: p2Name,
      opponentName: p1Name,
      opponentElo: elo,
      challengeTitle: challengeData.title,
      gameType: resolvedGameType,
      mode,
      timeLimitMins: challengeData.time_limit_mins,
      matchId: match.id,
    }).catch(() => {})
  }
}
