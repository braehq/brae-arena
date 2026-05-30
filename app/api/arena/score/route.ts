import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  runLighthouseScore,
  checkDeploymentReachable,
  calculateSpeedBonus,
  calculateTotalScore,
} from '@/lib/actions/scoring'
import { calculateElo, calculateXpAward, getTierFromElo } from '@/lib/actions/elo'
import type { ScoringWeights } from '@/types/arena'

// Internal route — called by /api/arena/submit after submission saved
export async function POST(request: NextRequest) {
  const internalKey = request.headers.get('x-internal-key')
  if (internalKey !== (process.env.BRAE_INTERNAL_API_KEY ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { submissionId, matchId } = await request.json()
  const service = await createServiceClient()

  // Mark submission as running
  await service.from('arena_submissions').update({ scoring_status: 'running' }).eq('id', submissionId)

  const { data: submission } = await service
    .from('arena_submissions')
    .select('*')
    .eq('id', submissionId)
    .single()

  if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })

  const { data: match } = await service
    .from('arena_matches')
    .select('*, challenge:arena_challenges(scoring_weights, time_limit_mins)')
    .eq('id', matchId)
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  try {
    const weights: ScoringWeights = match.challenge.scoring_weights

    // Check deployment reachable
    const reachable = await checkDeploymentReachable(submission.deployed_url)
    if (!reachable) {
      await service.from('arena_submissions').update({
        scoring_status: 'failed',
        score_total: 0,
        error_message: 'URL not reachable (returned non-200 or timed out)',
      }).eq('id', submissionId)
      await checkAndFinaliseMatch(service, matchId)
      return NextResponse.json({ success: true, scored: false })
    }

    // Run Lighthouse
    const lighthouse = await runLighthouseScore(submission.deployed_url)
    if (!lighthouse) {
      await service.from('arena_submissions').update({
        scoring_status: 'failed',
        score_total: weights.deployment_success, // at least deployment points
        error_message: 'Lighthouse scoring failed — deployment points only',
      }).eq('id', submissionId)
      await checkAndFinaliseMatch(service, matchId)
      return NextResponse.json({ success: true, scored: false })
    }

    const speedBonus = calculateSpeedBonus(
      new Date(submission.submitted_at),
      new Date(match.ends_at),
      new Date(match.started_at)
    )

    const total = calculateTotalScore(lighthouse, speedBonus, weights, true)

    await service.from('arena_submissions').update({
      scoring_status: 'complete',
      score_performance: lighthouse.performance,
      score_accessibility: lighthouse.accessibility,
      score_best_practices: lighthouse.bestPractices,
      score_seo: lighthouse.seo,
      score_speed_bonus: speedBonus,
      score_total: total,
    }).eq('id', submissionId)

  } catch (err) {
    await service.from('arena_submissions').update({
      scoring_status: 'failed',
      error_message: 'Scoring error: ' + String(err),
    }).eq('id', submissionId)
  }

  await checkAndFinaliseMatch(service, matchId)
  return NextResponse.json({ success: true })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkAndFinaliseMatch(service: any, matchId: string) {
  const { data: match } = await service
    .from('arena_matches')
    .select('*, challenge:arena_challenges(scoring_weights)')
    .eq('id', matchId)
    .single()

  if (!match || match.status === 'complete' || match.status === 'draw') return

  const { data: submissions } = await service
    .from('arena_submissions')
    .select('*')
    .eq('match_id', matchId)

  if (!submissions) return

  // Both scored, or time is up
  const bothSubmitted = submissions.length === 2
  const allScored = submissions.every(
    (s: { scoring_status: string }) => s.scoring_status === 'complete' || s.scoring_status === 'failed'
  )
  const timedOut = new Date() > new Date(match.ends_at)

  if (!((bothSubmitted && allScored) || timedOut)) return

  await service.from('arena_matches').update({ status: 'scoring' }).eq('id', matchId)
  // Log scoring_started event for replay
  await service.from('arena_match_events').insert({ match_id: matchId, event_type: 'scoring_started', payload: {} })

  const p1Sub = submissions.find((s: { user_id: string }) => s.user_id === match.player_one_id)
  const p2Sub = submissions.find((s: { user_id: string }) => s.user_id === match.player_two_id)
  const p1Score = p1Sub?.score_total ?? 0
  const p2Score = p2Sub?.score_total ?? 0

  let winnerId: string | null = null
  let finalStatus = 'complete'

  if (p1Score > p2Score) winnerId = match.player_one_id
  else if (p2Score > p1Score) winnerId = match.player_two_id
  else finalStatus = 'draw'

  // Fetch player profiles for ELO calculation
  const { data: p1Profile } = await service
    .from('profiles')
    .select('arena_elo, arena_matches_played, arena_wins, arena_losses, arena_streak')
    .eq('id', match.player_one_id).single()

  const { data: p2Profile } = await service
    .from('profiles')
    .select('arena_elo, arena_matches_played, arena_wins, arena_losses, arena_streak')
    .eq('id', match.player_two_id).single()

  if (!p1Profile || !p2Profile) return

  const p1Result = winnerId === match.player_one_id ? 'win' : finalStatus === 'draw' ? 'draw' : 'loss'
  const p2Result = winnerId === match.player_two_id ? 'win' : finalStatus === 'draw' ? 'draw' : 'loss'

  const eloP1 = match.mode === 'ranked'
    ? calculateElo(p1Profile.arena_elo, p2Profile.arena_elo, p1Result, p1Profile.arena_matches_played)
    : { newElo: p1Profile.arena_elo, change: 0, newTier: getTierFromElo(p1Profile.arena_elo) }

  const eloP2 = match.mode === 'ranked'
    ? calculateElo(p2Profile.arena_elo, p1Profile.arena_elo, p2Result, p2Profile.arena_matches_played)
    : { newElo: p2Profile.arena_elo, change: 0, newTier: getTierFromElo(p2Profile.arena_elo) }

  const perfectP1 = (p1Sub?.score_total ?? 0) >= 100
  const perfectP2 = (p2Sub?.score_total ?? 0) >= 100

  const p1NewStreak = p1Result === 'win' ? (p1Profile.arena_streak + 1) : 0
  const p2NewStreak = p2Result === 'win' ? (p2Profile.arena_streak + 1) : 0

  const xpP1 = calculateXpAward(p1Result, match.mode, p1NewStreak, perfectP1)
  const xpP2 = calculateXpAward(p2Result, match.mode, p2NewStreak, perfectP2)

  // Update match with results
  await service.from('arena_matches').update({
    status: finalStatus,
    winner_id: winnerId,
    elo_change_p1: eloP1.change,
    elo_change_p2: eloP2.change,
    xp_awarded_p1: xpP1,
    xp_awarded_p2: xpP2,
  }).eq('id', matchId)

  // Log match_complete event for replay
  await service.from('arena_match_events').insert({
    match_id: matchId,
    event_type: 'match_complete',
    payload: {
      winner_id: winnerId,
      p1_score: p1Score,
      p2_score: p2Score,
      p1_elo_change: eloP1.change,
      p2_elo_change: eloP2.change,
    },
  })

  // Update player profiles
  await service.from('profiles').update({
    arena_elo: eloP1.newElo,
    arena_rank_tier: eloP1.newTier,
    arena_matches_played: p1Profile.arena_matches_played + 1,
    arena_wins: p1Profile.arena_wins + (p1Result === 'win' ? 1 : 0),
    arena_losses: p1Profile.arena_losses + (p1Result === 'loss' ? 1 : 0),
    arena_streak: p1NewStreak,
    total_xp: p1Profile.total_xp + xpP1,
  }).eq('id', match.player_one_id)

  await service.from('profiles').update({
    arena_elo: eloP2.newElo,
    arena_rank_tier: eloP2.newTier,
    arena_matches_played: p2Profile.arena_matches_played + 1,
    arena_wins: p2Profile.arena_wins + (p2Result === 'win' ? 1 : 0),
    arena_losses: p2Profile.arena_losses + (p2Result === 'loss' ? 1 : 0),
    arena_streak: p2NewStreak,
    total_xp: p2Profile.total_xp + xpP2,
  }).eq('id', match.player_two_id)
}
