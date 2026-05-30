import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { GameMode, GameType } from '@/types/arena'

// POST /api/arena/queue — join queue
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { mode, gameType }: { mode: GameMode; gameType: GameType } = await request.json()

  const { data: profile } = await supabase
    .from('profiles')
    .select('arena_elo')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const service = createServiceClient()

  await service
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

  // Attempt matchmaking
  await attemptMatchmaking(service, user.id, mode, gameType, profile.arena_elo)

  return NextResponse.json({ success: true })
}

// DELETE /api/arena/queue — leave queue
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase
    .from('arena_queue')
    .update({ status: 'cancelled' })
    .eq('user_id', user.id)
    .eq('status', 'waiting')

  return NextResponse.json({ success: true })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function attemptMatchmaking(service: any, userId: string, mode: GameMode, gameType: string, elo: number) {
  const eloRange = 200

  let oppQuery = service
    .from('arena_queue')
    .select('*')
    .eq('mode', mode)
    .eq('status', 'waiting')
    .neq('user_id', userId)
    .gte('elo', elo - eloRange)
    .lte('elo', elo + eloRange)
    .order('joined_at', { ascending: true })
    .limit(1)

  if (gameType !== 'any') {
    oppQuery = oppQuery.or(`game_type.eq.${gameType},game_type.eq.any`)
  }

  const { data: opponents, error: opponentError } = await oppQuery

  if (opponentError) { console.error('[matchmaking] opponent query:', opponentError.message); return }
  if (!opponents || opponents.length === 0) return

  const opponent = opponents[0]

  const resolvedGameType = gameType === 'any'
    ? (opponent.game_type === 'any' ? (['speed_build', 'clone_battle', 'bug_hunt'] as const)[Math.floor(Math.random() * 3)] : opponent.game_type)
    : gameType

  const { data: challenges, error: challengeError } = await service
    .from('arena_challenges')
    .select('id, time_limit_mins')
    .eq('mode', resolvedGameType)
    .eq('active', true)

  if (challengeError) { console.error('[matchmaking] challenge query:', challengeError.message); return }
  if (!challenges || challenges.length === 0) {
    console.error('[matchmaking] no active challenges for:', resolvedGameType)
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
      game_type: resolvedGameType,
      status: 'active',
      started_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .select('id')
    .single()

  if (matchError || !match) { console.error('[matchmaking] match insert:', matchError?.message); return }

  const { error: updateError } = await service
    .from('arena_queue')
    .update({ status: 'matched', match_id: match.id })
    .in('user_id', [userId, opponent.user_id])

  if (updateError) console.error('[matchmaking] queue update:', updateError.message)
}
