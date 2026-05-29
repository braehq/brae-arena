import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { QueueClient } from './_components/queue-client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Matchmaking Queue' }

export default async function QueuePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: queueEntry } = await supabase
    .from('arena_queue')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  // If already matched, redirect straight to the match
  if (queueEntry?.status === 'matched' && queueEntry.match_id) {
    redirect(`/match/${queueEntry.match_id}`)
  }

  // If no queue entry, send back to lobby
  if (!queueEntry || queueEntry.status === 'cancelled') {
    redirect('/lobby')
  }

  return <QueueClient queueEntry={queueEntry} />
}
