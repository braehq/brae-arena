import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runLighthouseScore, checkDeploymentReachable, calculateSpeedBonus, calculateTotalScore } from '@/lib/actions/scoring'
import type { ScoringWeights } from '@/types/arena'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { deployedUrl, githubUrl } = await request.json()
  try { new URL(deployedUrl) } catch { return NextResponse.json({ error: 'Invalid URL' }, { status: 400 }) }

  const { data: match } = await supabase
    .from('arena_team_matches')
    .select('*, challenge:arena_challenges(scoring_weights, time_limit_mins)')
    .eq('id', id)
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  if (match.status !== 'active') return NextResponse.json({ error: 'Match not active' }, { status: 400 })

  const now = new Date()
  if (now > new Date(match.ends_at)) return NextResponse.json({ error: 'Time is up' }, { status: 400 })

  // Verify user is a member of one of the teams
  const { data: membership } = await supabase
    .from('arena_team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .in('team_id', [match.team_one_id, match.team_two_id])
    .single()

  if (!membership) return NextResponse.json({ error: 'Not a participant' }, { status: 403 })

  // Save submission slot
  const { data: player, error: playerError } = await supabase
    .from('arena_team_match_players')
    .upsert({
      team_match_id: id,
      team_id: membership.team_id,
      user_id: user.id,
      deployed_url: deployedUrl,
      github_url: githubUrl ?? null,
      submitted_at: now.toISOString(),
      scoring_status: 'running',
    }, { onConflict: 'team_match_id,user_id' })
    .select('id')
    .single()

  if (playerError || !player) return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })

  // Score inline (team matches score each player immediately)
  const weights: ScoringWeights = match.challenge?.scoring_weights ?? {
    deployment_success: 30, lighthouse_performance: 20, lighthouse_accessibility: 15,
    lighthouse_best_practices: 15, lighthouse_seo: 10, speed_bonus: 10,
  }

  const reachable = await checkDeploymentReachable(deployedUrl)
  if (!reachable) {
    await supabase.from('arena_team_match_players').update({ scoring_status: 'failed', score_total: 0 }).eq('id', player.id)
    await maybeFinishTeamMatch(supabase, id, match)
    return NextResponse.json({ ok: true, scored: false })
  }

  const lighthouse = await runLighthouseScore(deployedUrl)
  if (!lighthouse) {
    await supabase.from('arena_team_match_players').update({ scoring_status: 'failed', score_total: weights.deployment_success }).eq('id', player.id)
    await maybeFinishTeamMatch(supabase, id, match)
    return NextResponse.json({ ok: true, scored: false })
  }

  const speedBonus = calculateSpeedBonus(now, new Date(match.ends_at), new Date(match.started_at))
  const total = calculateTotalScore(lighthouse, speedBonus, weights, true)

  await supabase.from('arena_team_match_players').update({
    scoring_status: 'complete',
    score_performance: lighthouse.performance,
    score_accessibility: lighthouse.accessibility,
    score_best_practices: lighthouse.bestPractices,
    score_seo: lighthouse.seo,
    score_speed_bonus: speedBonus,
    score_total: total,
  }).eq('id', player.id)

  await maybeFinishTeamMatch(supabase, id, match)
  return NextResponse.json({ ok: true, score: total })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function maybeFinishTeamMatch(supabase: any, matchId: string, match: any) {
  const format: string = match.format ?? '2v2'
  const playersPerTeam = format === '3v3' ? 3 : 2
  const totalExpected = playersPerTeam * 2

  const { data: players } = await supabase
    .from('arena_team_match_players')
    .select('*')
    .eq('team_match_id', matchId)

  if (!players) return

  const allDone = players.length >= totalExpected &&
    players.every((p: { scoring_status: string }) => ['complete', 'failed'].includes(p.scoring_status))
  const timedOut = new Date() > new Date(match.ends_at)

  if (!allDone && !timedOut) return

  // Calculate team scores (average of members)
  const t1Players = players.filter((p: { team_id: string }) => p.team_id === match.team_one_id)
  const t2Players = players.filter((p: { team_id: string }) => p.team_id === match.team_two_id)
  const avg = (arr: { score_total: number | null }[]) =>
    arr.length ? Math.round(arr.reduce((s, p) => s + (p.score_total ?? 0), 0) / arr.length) : 0

  const t1Score = avg(t1Players)
  const t2Score = avg(t2Players)
  const winnerTeamId = t1Score > t2Score ? match.team_one_id : t2Score > t1Score ? match.team_two_id : null
  const finalStatus = winnerTeamId ? 'complete' : 'draw'

  // Simple ELO for teams (K=32)
  const { data: t1 } = await supabase.from('arena_teams').select('team_elo, team_wins, team_losses, team_matches_played').eq('id', match.team_one_id).single()
  const { data: t2 } = await supabase.from('arena_teams').select('team_elo, team_wins, team_losses, team_matches_played').eq('id', match.team_two_id).single()
  if (!t1 || !t2) return

  const K = 32
  const expected1 = 1 / (1 + Math.pow(10, (t2.team_elo - t1.team_elo) / 400))
  const s1 = winnerTeamId === match.team_one_id ? 1 : winnerTeamId == null ? 0.5 : 0
  const change1 = Math.round(K * (s1 - expected1))
  const change2 = -change1

  await supabase.from('arena_team_matches').update({
    status: finalStatus,
    winner_team_id: winnerTeamId,
    team_one_score: t1Score,
    team_two_score: t2Score,
    elo_change_t1: change1,
    elo_change_t2: change2,
  }).eq('id', matchId)

  await supabase.from('arena_teams').update({
    team_elo: t1.team_elo + change1,
    team_wins: t1.team_wins + (winnerTeamId === match.team_one_id ? 1 : 0),
    team_losses: t1.team_losses + (winnerTeamId === match.team_two_id ? 1 : 0),
    team_matches_played: t1.team_matches_played + 1,
  }).eq('id', match.team_one_id)

  await supabase.from('arena_teams').update({
    team_elo: t2.team_elo + change2,
    team_wins: t2.team_wins + (winnerTeamId === match.team_two_id ? 1 : 0),
    team_losses: t2.team_losses + (winnerTeamId === match.team_one_id ? 1 : 0),
    team_matches_played: t2.team_matches_played + 1,
  }).eq('id', match.team_two_id)
}
