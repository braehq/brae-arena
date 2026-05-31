import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendMatchFound } from '@/lib/email/send'

// POST — follow a user { targetUserId }
// DELETE — unfollow { targetUserId }

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { targetUserId } = await request.json()
  if (!targetUserId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 })
  if (targetUserId === user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })

  const { error } = await supabase.from('arena_follows').insert({
    follower_id: user.id,
    following_id: targetUserId,
  })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Already following' }, { status: 400 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Email the person being followed (fire-and-forget)
  const service = createServiceClient()
  const [followerAuth, followerProfile, targetProfile] = await Promise.all([
    service.auth.admin.getUserById(user.id),
    service.from('profiles').select('username, full_name').eq('id', user.id).single(),
    service.auth.admin.getUserById(targetUserId),
  ])

  const targetEmail = (await service.auth.admin.getUserById(targetUserId)).data?.user?.email
  const followerName = (followerProfile.data as { username?: string; full_name?: string } | null)?.username
    ?? (followerProfile.data as { username?: string; full_name?: string } | null)?.full_name
    ?? 'Someone'

  if (targetEmail) {
    const { data: tp } = await service.from('profiles').select('username, full_name').eq('id', targetUserId).single()
    const targetName = (tp as { username?: string; full_name?: string } | null)?.username ?? 'Player'
    // Reuse existing email infrastructure with a simple notification
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/arena/notify-follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.BRAE_INTERNAL_API_KEY ?? '' },
      body: JSON.stringify({ to: targetEmail, followerName, targetName }),
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { targetUserId } = await request.json()
  if (!targetUserId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 })

  await supabase.from('arena_follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)

  return NextResponse.json({ ok: true })
}
