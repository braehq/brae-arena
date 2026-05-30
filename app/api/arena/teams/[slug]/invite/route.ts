import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST — invite a player by username
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { username } = await request.json()
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 })

  // Get team and verify caller is owner/captain
  const { data: team } = await supabase
    .from('arena_teams')
    .select('id, max_members')
    .eq('slug', slug)
    .single()

  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const { data: myMembership } = await supabase
    .from('arena_team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', user.id)
    .single()

  if (!myMembership || !['owner', 'captain'].includes(myMembership.role)) {
    return NextResponse.json({ error: 'Only owners and captains can invite' }, { status: 403 })
  }

  // Check capacity
  const { count } = await supabase
    .from('arena_team_members')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', team.id)

  if ((count ?? 0) >= team.max_members) {
    return NextResponse.json({ error: 'Team is full' }, { status: 400 })
  }

  // Find target player
  const { data: target } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  if (!target) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  // Check not already in a team
  const { data: alreadyInTeam } = await supabase
    .from('arena_team_members')
    .select('id')
    .eq('user_id', target.id)
    .limit(1)
    .single()

  if (alreadyInTeam) return NextResponse.json({ error: 'Player is already in a team' }, { status: 400 })

  // Create invite
  const { error } = await supabase.from('arena_team_invites').insert({
    team_id: team.id,
    invited_by: user.id,
    invitee_id: target.id,
  })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Invite already pending' }, { status: 400 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
