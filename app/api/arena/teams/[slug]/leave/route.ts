import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE — leave team (or kick a member if owner + userId in body)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const targetUserId: string = body.userId ?? user.id

  const { data: team } = await supabase
    .from('arena_teams')
    .select('id, owner_id')
    .eq('slug', slug)
    .single()

  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  // Kicking someone else requires owner
  if (targetUserId !== user.id && team.owner_id !== user.id) {
    return NextResponse.json({ error: 'Only the owner can kick members' }, { status: 403 })
  }

  // Owner can't leave — must disband or transfer first
  if (targetUserId === user.id && team.owner_id === user.id) {
    return NextResponse.json({ error: 'Owners must disband the team or transfer ownership before leaving' }, { status: 400 })
  }

  await supabase
    .from('arena_team_members')
    .delete()
    .eq('team_id', team.id)
    .eq('user_id', targetUserId)

  return NextResponse.json({ ok: true })
}
