'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { leaveQueue } from '@/lib/actions/queue'
import { Button } from '@/components/ui/button'
import type { ArenaQueue } from '@/types/arena'
import { GAME_TYPE_LABELS } from '@/types/arena'

interface Props {
  queueEntry: ArenaQueue
}

export function QueueClient({ queueEntry }: Props) {
  const router = useRouter()
  const [elapsed, setElapsed] = useState(0)
  const [leaving, setLeaving] = useState(false)

  // Elapsed timer
  useEffect(() => {
    const start = new Date(queueEntry.joined_at).getTime()
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [queueEntry.joined_at])

  const handleMatchFound = useCallback((matchId: string) => {
    toast.success('Match found! Loading match room…')
    router.push(`/match/${matchId}`)
  }, [router])

  // Supabase Realtime subscription on own queue row
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('queue:' + queueEntry.user_id)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'arena_queue',
          filter: `user_id=eq.${queueEntry.user_id}`,
        },
        (payload) => {
          const updated = payload.new as ArenaQueue
          if (updated.status === 'matched' && updated.match_id) {
            handleMatchFound(updated.match_id)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [queueEntry.user_id, handleMatchFound])

  // Polling fallback — check every 3s in case Realtime misses an event
  useEffect(() => {
    const supabase = createClient()
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('arena_queue')
        .select('status, match_id')
        .eq('user_id', queueEntry.user_id)
        .single()
      if (data?.status === 'matched' && data.match_id) {
        handleMatchFound(data.match_id)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [queueEntry.user_id, handleMatchFound])

  async function handleLeave() {
    setLeaving(true)
    await leaveQueue()
    toast.info('Left the queue.')
    router.push('/lobby')
  }

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`

  // ELO range expands by 50 every 30s
  const eloExpansion = Math.floor(elapsed / 30) * 50
  const eloRange = 200 + eloExpansion

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center px-4 text-center">
      <div className="w-full max-w-sm space-y-6">
        {/* Spinner */}
        <div className="flex justify-center">
          <div className="relative h-24 w-24">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">⚔️</span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Finding opponent</p>
          <p className="mt-1 text-3xl font-bold font-mono text-foreground">{timeStr}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Mode</span>
            <span className="font-medium capitalize text-foreground">{queueEntry.mode}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Game type</span>
            <span className="font-medium text-foreground">{GAME_TYPE_LABELS[queueEntry.game_type]}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Your ELO</span>
            <span className="font-medium text-foreground">{queueEntry.elo}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">ELO range</span>
            <span className="font-medium text-foreground">±{eloRange}</span>
          </div>
        </div>

        {elapsed > 30 && (
          <p className="text-xs text-muted-foreground">
            ELO range expanding every 30s to find you a match faster.
          </p>
        )}

        <Button variant="outline" onClick={handleLeave} disabled={leaving} className="w-full">
          {leaving ? 'Leaving…' : 'Leave queue'}
        </Button>
      </div>
    </div>
  )
}
