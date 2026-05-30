import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST — respond to a team invite { inviteId, action: 'accept' | 'decline' }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { inviteId, action } = await request.json()
  if (!inviteId || !['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'inviteId and action required' }, { status: 400 })
  }

  const { data: invite } = await supabase
    .from('arena_team_invites')
    .select('*, team:arena_teams(id, max_members)')
    .eq('id', inviteId)
    .eq('invitee_id', user.id)
    .eq('status', 'pending')
    .single()

  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })

  await supabase
    .from('arena_team_invites')
    .update({ status: action === 'accept' ? 'accepted' : 'declined' })
    .eq('id', inviteId)

  if (action === 'accept') {
    const team = invite.team as { id: string; max_members: number }

    // Double-check capacity
    const { count } = await supabase
      .from('arena_team_members')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', team.id)

    if ((count ?? 0) >= team.max_members) {
      return NextResponse.json({ error: 'Team is now full' }, { status: 400 })
    }

    await supabase.from('arena_team_members').insert({
      team_id: team.id,
      user_id: user.id,
      role: 'member',
    })
  }

  return NextResponse.json({ ok: true })
}
