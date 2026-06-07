// Shared 1v1 match finaliser for *score-based* engines (both submissions carry a
// `score_total`). Generalised from the inline finaliser in /api/arena/submit-code so new
// engines (e.g. regex_duel) can reuse the exact ELO/XP/profile/event/email pipeline without
// duplicating it. The live submit-code route keeps its own copy for now — see
// ARENA_GAME_EXPANSION_PLAN.md §7 for the planned consolidation.

import type { createServiceClient } from '@/lib/supabase/server'
import { calculateElo, calculateXpAward, getTierFromElo } from '@/lib/actions/elo'
import { sendMatchResult, sendRankUp } from '@/lib/email/send'
import { RANK_TIERS } from '@/types/arena'
import type { RankTier } from '@/types/arena'

type Service = ReturnType<typeof createServiceClient>
type Result = 'win' | 'loss' | 'draw'

/**
 * Finalise a match once both players have a scored submission, or time is up.
 * Idempotent: returns early if the match is already complete/draw or not yet ready.
 * Winner = higher `score_total`; tie = draw. ELO only moves in ranked.
 */
export async function finaliseVersusMatch(service: Service, matchId: string): Promise<void> {
  const { data: match } = await service
    .from('arena_matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (!match || match.status === 'complete' || match.status === 'draw') return

  const { data: submissions } = await service
    .from('arena_submissions')
    .select('*')
    .eq('match_id', matchId)

  if (!submissions) return

  const bothSubmitted = submissions.length === 2
  const allScored = submissions.every(
    (s: { scoring_status: string }) => s.scoring_status === 'complete' || s.scoring_status === 'failed',
  )
  const timedOut = match.ends_at ? new Date() > new Date(match.ends_at) : false
  if (!((bothSubmitted && allScored) || timedOut)) return

  await service.from('arena_matches').update({ status: 'scoring' }).eq('id', matchId)
  await service.from('arena_match_events').insert({ match_id: matchId, event_type: 'scoring_started', payload: {} })

  const p1Sub = submissions.find((s: { user_id: string }) => s.user_id === match.player_one_id)
  const p2Sub = submissions.find((s: { user_id: string }) => s.user_id === match.player_two_id)
  const p1Score: number = p1Sub?.score_total ?? 0
  const p2Score: number = p2Sub?.score_total ?? 0

  let winnerId: string | null = null
  let finalStatus: 'complete' | 'draw' = 'complete'
  if (p1Score > p2Score) winnerId = match.player_one_id
  else if (p2Score > p1Score) winnerId = match.player_two_id
  else finalStatus = 'draw'

  const [{ data: p1Profile }, { data: p2Profile }] = await Promise.all([
    service.from('profiles')
      .select('arena_elo, arena_matches_played, arena_wins, arena_losses, arena_streak, total_xp, arena_rank_tier')
      .eq('id', match.player_one_id).single(),
    service.from('profiles')
      .select('arena_elo, arena_matches_played, arena_wins, arena_losses, arena_streak, total_xp, arena_rank_tier')
      .eq('id', match.player_two_id).single(),
  ])
  if (!p1Profile || !p2Profile) return

  const p1Result: Result = winnerId === match.player_one_id ? 'win' : finalStatus === 'draw' ? 'draw' : 'loss'
  const p2Result: Result = winnerId === match.player_two_id ? 'win' : finalStatus === 'draw' ? 'draw' : 'loss'

  const eloP1 = match.mode === 'ranked'
    ? calculateElo(p1Profile.arena_elo, p2Profile.arena_elo, p1Result, p1Profile.arena_matches_played)
    : { newElo: p1Profile.arena_elo, change: 0, newTier: getTierFromElo(p1Profile.arena_elo) }
  const eloP2 = match.mode === 'ranked'
    ? calculateElo(p2Profile.arena_elo, p1Profile.arena_elo, p2Result, p2Profile.arena_matches_played)
    : { newElo: p2Profile.arena_elo, change: 0, newTier: getTierFromElo(p2Profile.arena_elo) }

  const p1Streak = p1Result === 'win' ? p1Profile.arena_streak + 1 : 0
  const p2Streak = p2Result === 'win' ? p2Profile.arena_streak + 1 : 0
  const xpP1 = calculateXpAward(p1Result, match.mode, p1Streak, p1Score >= 100)
  const xpP2 = calculateXpAward(p2Result, match.mode, p2Streak, p2Score >= 100)

  await service.from('arena_matches').update({
    status: finalStatus,
    winner_id: winnerId,
    elo_change_p1: eloP1.change,
    elo_change_p2: eloP2.change,
    xp_awarded_p1: xpP1,
    xp_awarded_p2: xpP2,
  }).eq('id', matchId)

  await service.from('arena_match_events').insert({
    match_id: matchId,
    event_type: 'match_complete',
    payload: { winner_id: winnerId, p1_score: p1Score, p2_score: p2Score, p1_elo_change: eloP1.change, p2_elo_change: eloP2.change },
  })

  await Promise.all([
    service.from('profiles').update({
      arena_elo: eloP1.newElo, arena_rank_tier: eloP1.newTier,
      arena_matches_played: p1Profile.arena_matches_played + 1,
      arena_wins: p1Profile.arena_wins + (p1Result === 'win' ? 1 : 0),
      arena_losses: p1Profile.arena_losses + (p1Result === 'loss' ? 1 : 0),
      arena_streak: p1Streak, total_xp: p1Profile.total_xp + xpP1,
    }).eq('id', match.player_one_id),
    service.from('profiles').update({
      arena_elo: eloP2.newElo, arena_rank_tier: eloP2.newTier,
      arena_matches_played: p2Profile.arena_matches_played + 1,
      arena_wins: p2Profile.arena_wins + (p2Result === 'win' ? 1 : 0),
      arena_losses: p2Profile.arena_losses + (p2Result === 'loss' ? 1 : 0),
      arena_streak: p2Streak, total_xp: p2Profile.total_xp + xpP2,
    }).eq('id', match.player_two_id),
  ])

  // Result + rank-up emails, fire-and-forget
  void sendVersusEmails(service, match, [
    { id: match.player_one_id, result: p1Result, score: p1Score, oppScore: p2Score, elo: eloP1, xp: xpP1, oldTier: p1Profile.arena_rank_tier },
    { id: match.player_two_id, result: p2Result, score: p2Score, oppScore: p1Score, elo: eloP2, xp: xpP2, oldTier: p2Profile.arena_rank_tier },
  ]).catch(() => {})
}

interface PlayerOutcome {
  id: string
  result: Result
  score: number
  oppScore: number
  elo: { newElo: number; change: number; newTier: RankTier }
  xp: number
  oldTier: string
}

async function sendVersusEmails(
  service: Service,
  match: { id: string; challenge_id: string },
  players: [PlayerOutcome, PlayerOutcome],
): Promise<void> {
  const [a, b] = players
  const [aAuth, bAuth, aProf, bProf, ch] = await Promise.all([
    service.auth.admin.getUserById(a.id),
    service.auth.admin.getUserById(b.id),
    service.from('profiles').select('username, full_name').eq('id', a.id).single(),
    service.from('profiles').select('username, full_name').eq('id', b.id).single(),
    service.from('arena_challenges').select('title').eq('id', match.challenge_id).single(),
  ])

  const aName = aProf.data?.username ?? aProf.data?.full_name ?? 'Player'
  const bName = bProf.data?.username ?? bProf.data?.full_name ?? 'Player'
  const title = ch.data?.title ?? 'Challenge'

  const rows: Array<{ email?: string; name: string; oppName: string; p: PlayerOutcome }> = [
    { email: aAuth.data?.user?.email, name: aName, oppName: bName, p: a },
    { email: bAuth.data?.user?.email, name: bName, oppName: aName, p: b },
  ]

  for (const { email, name, oppName, p } of rows) {
    if (!email) continue
    await sendMatchResult(email, {
      playerName: name, opponentName: oppName,
      result: p.result, score: p.score, opponentScore: p.oppScore,
      eloChange: p.elo.change, newElo: p.elo.newElo, newTier: p.elo.newTier,
      xpAwarded: p.xp, challengeTitle: title, matchId: match.id,
    }).catch(() => {})

    if (p.oldTier !== p.elo.newTier && RANK_TIERS[p.elo.newTier as RankTier]) {
      await sendRankUp(email, {
        playerName: name, oldTier: p.oldTier, newTier: p.elo.newTier,
        newElo: p.elo.newElo, xpBonus: 500,
      }).catch(() => {})
    }
  }
}
