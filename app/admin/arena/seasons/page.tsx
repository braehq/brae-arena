import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SeasonManager } from './_components/season-manager'

export const metadata: Metadata = { title: 'Admin — Seasons' }

export default async function AdminSeasonsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role?: string } | null)?.role !== 'admin') redirect('/lobby')

  const { data: seasons } = await supabase
    .from('arena_seasons')
    .select('*')
    .order('number', { ascending: false })

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Season Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create seasons, end active seasons, and snapshot rankings.</p>
      </div>
      <SeasonManager seasons={seasons ?? []} />
    </div>
  )
}
