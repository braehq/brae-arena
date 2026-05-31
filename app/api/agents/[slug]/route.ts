import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { agent_code, description } = await request.json()

  const { data: agent } = await supabase.from('arena_agents').select('id, user_id').eq('slug', slug).single()
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  if (agent.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (agent_code && !agent_code.includes('function agent')) {
    return NextResponse.json({ error: 'Agent code must define a function named "agent"' }, { status: 400 })
  }

  const { error } = await supabase.from('arena_agents').update({
    ...(agent_code ? { agent_code } : {}),
    ...(description !== undefined ? { description } : {}),
  }).eq('id', agent.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
