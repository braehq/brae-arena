import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { scoreCssGolf } from '@/lib/css-golf-runner'
import { finaliseVersusMatch } from '@/lib/actions/finalize-match'

// Submit a CSS Golf entry: the server computes the golf score (code length vs par)
// and trusts the client's DOM-check results — same pattern as the css_battle engine,
// which also has no server-side headless browser.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { matchId, html, testsPassed, testsTotal } = body as {
    matchId: string
    html: string
    testsPassed: number
    testsTotal: number
  }

  if (!matchId || typeof html !== 'string') {
    return NextResponse.json({ error: 'matchId and html required' }, { status: 400 })
  }

  const service = createServiceClient()
  const now = new Date()

  const { data: match } = await service.from('arena_matches').select('*').eq('id', matchId).single()
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  if (match.status !== 'active') return NextResponse.json({ error: 'Match not active' }, { status: 400 })
  if (match.ends_at && now > new Date(match.ends_at)) {
    return NextResponse.json({ error: 'Time is up' }, { status: 400 })
  }
  if (match.player_one_id !== user.id && match.player_two_id !== user.id) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
  }

  const { data: challenge } = await service
    .from('arena_challenges')
    .select('id, solution_code')
    .eq('id', match.challenge_id)
    .single()
  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })

  // Par is the reference solution length — server-only (solution_code never reaches the client)
  const parLength = typeof challenge.solution_code === 'string' ? challenge.solution_code.length : null
  const safeTestsPassed = Math.max(0, Math.min(Number(testsPassed) || 0, Number(testsTotal) || 0))
  const safeTestsTotal = Math.max(0, Number(testsTotal) || 0)

  const score = scoreCssGolf(html, safeTestsPassed, safeTestsTotal, parLength)

  // Anti-cheat: flag suspiciously fast submissions
  const secondsElapsed = match.started_at
    ? (now.getTime() - new Date(match.started_at).getTime()) / 1000
    : 999
  if (secondsElapsed < 20) {
    await service.from('arena_anti_cheat_logs').insert({
      match_id: matchId,
      user_id: user.id,
      event_type: 'submission_too_fast',
      detail: { seconds_elapsed: Math.round(secondsElapsed), engine: 'css_golf' },
    })
  }

  const { data: submission, error } = await service
    .from('arena_submissions')
    .upsert(
      {
        match_id: matchId,
        user_id: user.id,
        deployed_url: `css-golf://match/${matchId}`,
        submitted_at: now.toISOString(),
        submitted_code: JSON.stringify({ html }),
        tests_passed: score.testsPassed,
        tests_total: score.testsTotal,
        score_total: score.scoreTotal,
        score_speed_bonus: score.brevityBonus,
        scoring_status: 'complete',
      },
      { onConflict: 'match_id,user_id' },
    )
    .select('id')
    .single()

  if (error || !submission) {
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
  }

  await service.from('arena_match_events').insert({
    match_id: matchId,
    user_id: user.id,
    event_type: 'player_submitted',
    payload: {
      tests_passed: score.testsPassed,
      tests_total: score.testsTotal,
      char_count: score.charCount,
      par_length: parLength,
      brevity_bonus: score.brevityBonus,
      score: score.scoreTotal,
    },
  })

  await finaliseVersusMatch(service, matchId)

  return NextResponse.json({
    ok: true,
    testsPassed: score.testsPassed,
    testsTotal: score.testsTotal,
    charCount: score.charCount,
    parLength,
    brevityBonus: score.brevityBonus,
    score: score.scoreTotal,
  })
}
