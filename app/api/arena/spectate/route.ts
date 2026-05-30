import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/arena/spectate  { matchId }  — join spectating
// DELETE /api/arena/spectate { matchId } — leave spectating

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId } = await request.json()
  if (!matchId) return NextResponse.json({ error: 'matchId required' }, { status: 400 })

  // Verify match exists and is active
  const { data: match } = await supabase
    .from('arena_matches')
    .select('id, status')
    .eq('id', matchId)
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  if (!['active', 'scoring'].includes(match.status)) {
    return NextResponse.json({ error: 'Match is not spectatable' }, { status: 400 })
  }

  // Upsert spectator row (re-joining resets left_at)
  await supabase.from('arena_spectators').upsert(
    { match_id: matchId, user_id: user.id, joined_at: new Date().toISOString(), left_at: null },
    { onConflict: 'match_id,user_id' }
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId } = await request.json()
  if (!matchId) return NextResponse.json({ error: 'matchId required' }, { status: 400 })

  await supabase
    .from('arena_spectators')
    .update({ left_at: new Date().toISOString() })
    .eq('match_id', matchId)
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
