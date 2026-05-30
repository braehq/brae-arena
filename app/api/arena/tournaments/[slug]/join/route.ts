import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch tournament
  const { data: tournament } = await supabase
    .from('arena_tournaments')
    .select('id, status, max_participants, min_elo')
    .eq('slug', slug)
    .single()

  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  if (tournament.status !== 'registration') {
    return NextResponse.json({ error: 'Tournament is not open for registration' }, { status: 400 })
  }

  // Check ELO requirement
  const { data: profile } = await supabase
    .from('profiles')
    .select('arena_elo')
    .eq('id', user.id)
    .single()

  if ((profile?.arena_elo ?? 0) < tournament.min_elo) {
    return NextResponse.json({ error: `Minimum ELO of ${tournament.min_elo} required` }, { status: 400 })
  }

  // Check capacity
  const { count } = await supabase
    .from('arena_tournament_participants')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournament.id)

  if ((count ?? 0) >= tournament.max_participants) {
    return NextResponse.json({ error: 'Tournament is full' }, { status: 400 })
  }

  // Register
  const { error } = await supabase.from('arena_tournament_participants').insert({
    tournament_id: tournament.id,
    user_id: user.id,
  })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Already registered' }, { status: 400 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
