import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST — accept a team match challenge (challenged team owner/captain)
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: match } = await supabase
    .from('arena_team_matches')
    .select('*, challenge:arena_challenges(time_limit_mins)')
    .eq('id', id)
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  if (match.status !== 'pending') return NextResponse.json({ error: 'Match is not pending' }, { status: 400 })

  // Caller must be owner/captain of team_two
  const { data: myRole } = await supabase
    .from('arena_team_members')
    .select('role')
    .eq('team_id', match.team_two_id)
    .eq('user_id', user.id)
    .single()

  if (!myRole || !['owner', 'captain'].includes(myRole.role)) {
    return NextResponse.json({ error: 'Only the challenged team\'s owner or captain can accept' }, { status: 403 })
  }

  const startedAt = new Date()
  const endsAt = new Date(startedAt.getTime() + (match.challenge?.time_limit_mins ?? 30) * 60 * 1000)

  await supabase.from('arena_team_matches').update({
    status: 'active',
    started_at: startedAt.toISOString(),
    ends_at: endsAt.toISOString(),
  }).eq('id', id)

  return NextResponse.json({ ok: true })
}
