import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChallengeManager } from './_components/challenge-manager'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin — Arena' }

export default async function AdminArenaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Role check — only workspace plan users (admins) can access
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  // Allow if role column exists or plan = workspace; adjust when admin role is added
  // TODO: replace with profiles.role = 'admin' check once that column exists
  if (!profile || profile.plan !== 'workspace') {
    redirect('/lobby')
  }

  const { data: challenges } = await supabase
    .from('arena_challenges')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: stats } = await supabase
    .from('arena_matches')
    .select('id', { count: 'exact', head: true })

  const { data: queueCount } = await supabase
    .from('arena_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'waiting')

  return (
    <ChallengeManager
      challenges={challenges ?? []}
      totalMatches={stats?.length ?? 0}
      activeInQueue={queueCount?.length ?? 0}
    />
  )
}
