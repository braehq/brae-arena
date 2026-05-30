import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/arena/teams — list teams (search + browse)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  const supabase = await createClient()

  let query = supabase
    .from('arena_teams')
    .select('*, member_count:arena_team_members(count)')
    .order('team_elo', { ascending: false })
    .limit(50)

  if (q) query = query.ilike('name', `%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/arena/teams — create team
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Can't create a team if already in one
  const { data: existing } = await supabase
    .from('arena_team_members')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (existing) return NextResponse.json({ error: 'You are already in a team' }, { status: 400 })

  const { name, tag, slug, description, is_open } = await request.json()
  if (!name || !tag || !slug) return NextResponse.json({ error: 'name, tag and slug required' }, { status: 400 })

  // Validate tag
  if (!/^[A-Z0-9]{2,5}$/.test(tag.toUpperCase())) {
    return NextResponse.json({ error: 'Tag must be 2–5 uppercase letters/numbers' }, { status: 400 })
  }

  // Create team + add owner as member in a transaction-like pair
  const { data: team, error: teamError } = await supabase
    .from('arena_teams')
    .insert({ name, tag: tag.toUpperCase(), slug, description: description || null, owner_id: user.id, is_open: is_open ?? false })
    .select('id, slug')
    .single()

  if (teamError) {
    if (teamError.code === '23505') return NextResponse.json({ error: 'Slug or tag already taken' }, { status: 400 })
    return NextResponse.json({ error: teamError.message }, { status: 500 })
  }

  await supabase.from('arena_team_members').insert({ team_id: team.id, user_id: user.id, role: 'owner' })

  return NextResponse.json({ ok: true, slug: team.slug })
}
