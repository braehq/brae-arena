import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/arena/tournaments — list tournaments (upcoming, registration, active)
export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('arena_tournaments')
    .select('*')
    .not('status', 'in', '("cancelled","complete")')
    .order('starts_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
