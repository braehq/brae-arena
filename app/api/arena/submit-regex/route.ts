import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { scoreRegex, type RegexCorpusItem } from '@/lib/regex-duel-runner'
import { finaliseVersusMatch } from '@/lib/actions/finalize-match'

// Submit + authoritatively score a Regex Duel entry, then finalise the match.
// Regex validation is deterministic and identical on client and server, so (unlike the
// JS/vm engines) we simply recompute the score here as the source of truth.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId, pattern, flags } = await request.json()
  if (!matchId || typeof pattern !== 'string') {
    return NextResponse.json({ error: 'matchId and pattern required' }, { status: 400 })
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

  const { data: challenge } = await service.from('arena_challenges')
    .select('id, test_cases, solution_code')
    .eq('id', match.challenge_id)
    .single()
  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })

  const corpus = (challenge.test_cases as RegexCorpusItem[] | null) ?? []
  const parLength = challenge.solution_code ? challenge.solution_code.length : null
  const safeFlags = typeof flags === 'string' ? flags : ''

  const score = scoreRegex(pattern, safeFlags, corpus, parLength)
  const run = corpus.map((c) => {
    // Recompute per-item pass for storage/replay (cheap)
    let matched = false
    try { matched = new RegExp(pattern, safeFlags.replace(/[^ims]/g, '')).test(c.input) } catch {}
    return { label: c.label, input: c.input, expected: c.expected, passed: c.expected === 'match' ? matched : !matched }
  })

  // Anti-cheat: flag improbably fast submissions
  const secondsElapsed = match.started_at ? (now.getTime() - new Date(match.started_at).getTime()) / 1000 : 999
  if (secondsElapsed < 20) {
    await service.from('arena_anti_cheat_logs').insert({
      match_id: matchId, user_id: user.id,
      event_type: 'submission_too_fast',
      detail: { seconds_elapsed: Math.round(secondsElapsed), engine: 'regex_duel' },
    })
  }

  const { data: submission, error } = await service.from('arena_submissions')
    .upsert({
      match_id: matchId,
      user_id: user.id,
      deployed_url: `regex://match/${matchId}`,
      submitted_at: now.toISOString(),
      submitted_code: JSON.stringify({ pattern, flags: safeFlags }),
      test_results: run,
      tests_passed: score.testsPassed,
      tests_total: score.testsTotal,
      score_total: score.scoreTotal,
      score_speed_bonus: score.brevityBonus,
      scoring_status: 'complete',
    }, { onConflict: 'match_id,user_id' })
    .select('id')
    .single()

  if (error || !submission) return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })

  await service.from('arena_match_events').insert({
    match_id: matchId, user_id: user.id,
    event_type: 'player_submitted',
    payload: { tests_passed: score.testsPassed, tests_total: score.testsTotal, score: score.scoreTotal },
  })

  await finaliseVersusMatch(service, matchId)

  return NextResponse.json({
    ok: true,
    testsPassed: score.testsPassed,
    testsTotal: score.testsTotal,
    score: score.scoreTotal,
    brevityBonus: score.brevityBonus,
    error: score.error,
  })
}
