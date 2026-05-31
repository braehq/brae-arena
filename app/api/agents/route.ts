import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, slug, description, agent_code } = await request.json()
  if (!name || !slug || !agent_code) return NextResponse.json({ error: 'name, slug, agent_code required' }, { status: 400 })

  // Basic validation: must contain "function agent"
  if (!agent_code.includes('function agent')) {
    return NextResponse.json({ error: 'Agent code must define a function named "agent"' }, { status: 400 })
  }

  const { data, error } = await supabase.from('arena_agents').insert({
    user_id: user.id,
    name,
    slug,
    description: description || null,
    agent_code,
  }).select('slug').single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Slug already taken' }, { status: 400 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, slug: data.slug })
}
