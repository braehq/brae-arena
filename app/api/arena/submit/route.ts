import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId, deployedUrl, githubUrl } = await request.json()

  if (!matchId || !deployedUrl) {
    return NextResponse.json({ error: 'matchId and deployedUrl required' }, { status: 400 })
  }

  // Validate URL format
  try { new URL(deployedUrl) } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  const service = createServiceClient()

  // Fetch match
  const { data: match } = await service
    .from('arena_matches')
    .select('*, challenge:arena_challenges(time_limit_mins, scoring_weights)')
    .eq('id', matchId)
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  if (match.player_one_id !== user.id && match.player_two_id !== user.id) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
  }
  if (match.status !== 'active') {
    return NextResponse.json({ error: 'Match is not active' }, { status: 400 })
  }

  // Check deadline
  const now = new Date()
  const endsAt = new Date(match.ends_at)
  if (now > endsAt) {
    return NextResponse.json({ error: 'Time is up' }, { status: 400 })
  }

  // Anti-cheat: flag if submitted within 60s of match start
  const startedAt = new Date(match.started_at)
  const secondsElapsed = (now.getTime() - startedAt.getTime()) / 1000
  if (secondsElapsed < 60) {
    await service.from('arena_anti_cheat_logs').insert({
      match_id: matchId,
      user_id: user.id,
      event_type: 'submission_too_fast',
      detail: { seconds_elapsed: Math.round(secondsElapsed), deployed_url: deployedUrl },
    })
  }

  // Check for duplicate URL across active matches
  const { data: existingSubmissions } = await service
    .from('arena_submissions')
    .select('id, match_id')
    .eq('deployed_url', deployedUrl)
    .neq('match_id', matchId)
    .limit(1)

  if (existingSubmissions && existingSubmissions.length > 0) {
    await service.from('arena_anti_cheat_logs').insert({
      match_id: matchId,
      user_id: user.id,
      event_type: 'duplicate_url',
      detail: { deployed_url: deployedUrl },
    })
  }

  // Insert or update submission
  const { data: submission, error: subError } = await service
    .from('arena_submissions')
    .upsert({
      match_id: matchId,
      user_id: user.id,
      deployed_url: deployedUrl,
      github_url: githubUrl ?? null,
      submitted_at: now.toISOString(),
      scoring_status: 'pending',
    }, { onConflict: 'match_id,user_id' })
    .select('id')
    .single()

  if (subError || !submission) {
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
  }

  // Log player_submitted event for replay
  await service.from('arena_match_events').insert({
    match_id: matchId,
    user_id: user.id,
    event_type: 'player_submitted',
    payload: { url: deployedUrl, submitted_at: now.toISOString() },
  })

  // Trigger scoring asynchronously
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${request.headers.get('host')}`
  fetch(`${appUrl}/api/arena/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.BRAE_INTERNAL_API_KEY ?? '' },
    body: JSON.stringify({ submissionId: submission.id, matchId }),
  }).catch(() => {})

  return NextResponse.json({ success: true, submissionId: submission.id })
}
