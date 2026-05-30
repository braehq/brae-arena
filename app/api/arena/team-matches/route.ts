import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET — list active/recent team matches
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('arena_team_matches')
    .select(`
      *,
      challenge:arena_challenges(title, game_type, difficulty),
      team_one:arena_teams!arena_team_matches_team_one_id_fkey(id, name, tag, slug, avatar_url, team_elo, team_rank_tier),
      team_two:arena_teams!arena_team_matches_team_two_id_fkey(id, name, tag, slug, avatar_url, team_elo, team_rank_tier)
    `)
    .not('status', 'in', '("cancelled")')
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — challenge another team { teamSlug: my team, opponentSlug, challengeId, format }
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { teamSlug, opponentSlug, challengeId, format } = await request.json()
  if (!teamSlug || !opponentSlug || !challengeId) {
    return NextResponse.json({ error: 'teamSlug, opponentSlug and challengeId required' }, { status: 400 })
  }

  // Verify caller is owner/captain of their team
  const { data: myTeam } = await supabase
    .from('arena_teams')
    .select('id')
    .eq('slug', teamSlug)
    .single()

  if (!myTeam) return NextResponse.json({ error: 'Your team not found' }, { status: 404 })

  const { data: myRole } = await supabase
    .from('arena_team_members')
    .select('role')
    .eq('team_id', myTeam.id)
    .eq('user_id', user.id)
    .single()

  if (!myRole || !['owner', 'captain'].includes(myRole.role)) {
    return NextResponse.json({ error: 'Only owners and captains can issue challenges' }, { status: 403 })
  }

  const { data: opponent } = await supabase
    .from('arena_teams')
    .select('id')
    .eq('slug', opponentSlug)
    .single()

  if (!opponent) return NextResponse.json({ error: 'Opponent team not found' }, { status: 404 })
  if (opponent.id === myTeam.id) return NextResponse.json({ error: 'Cannot challenge your own team' }, { status: 400 })

  // Verify challenge exists
  const { data: challenge } = await supabase
    .from('arena_challenges')
    .select('id, time_limit_mins')
    .eq('id', challengeId)
    .eq('active', true)
    .single()

  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })

  const { data: match, error: matchError } = await supabase
    .from('arena_team_matches')
    .insert({
      challenge_id: challengeId,
      team_one_id: myTeam.id,
      team_two_id: opponent.id,
      format: format ?? '2v2',
      status: 'pending',
      challenged_by: user.id,
    })
    .select('id')
    .single()

  if (matchError) return NextResponse.json({ error: matchError.message }, { status: 500 })

  return NextResponse.json({ ok: true, matchId: match.id })
}
