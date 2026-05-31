import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST — send a chat message
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId, message } = await request.json()
  if (!matchId || !message?.trim()) return NextResponse.json({ error: 'matchId and message required' }, { status: 400 })
  if (message.length > 200) return NextResponse.json({ error: 'Message too long (200 chars max)' }, { status: 400 })

  const { error } = await supabase.from('arena_match_chat').insert({
    match_id: matchId,
    user_id: user.id,
    message: message.trim(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
