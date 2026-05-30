import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TournamentManager } from './_components/tournament-manager'

export const metadata: Metadata = { title: 'Admin — Tournaments' }

export default async function AdminTournamentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role?: string } | null)?.role !== 'admin') redirect('/lobby')

  const [{ data: tournaments }, { data: seasons }] = await Promise.all([
    supabase.from('arena_tournaments').select('*').order('created_at', { ascending: false }),
    supabase.from('arena_seasons').select('id, name, number').order('number', { ascending: false }),
  ])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Tournament Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create and manage bracket tournaments.</p>
      </div>
      <TournamentManager tournaments={tournaments ?? []} seasons={seasons ?? []} />
    </div>
  )
}
