'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Bot, Zap } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AgentQueuePage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [agent, setAgent] = useState<{ id: string; name: string; agent_elo: number } | null>(null)
  const [queuing, setQueuing] = useState(false)
  const [inQueue, setInQueue] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [matchId, setMatchId] = useState<string | null>(null)

  useEffect(() => {
    params.then(({ slug: s }) => {
      setSlug(s)
      const supabase = createClient()
      supabase.from('arena_agents').select('id, name, agent_elo').eq('slug', s).single()
        .then(({ data }) => { if (data) setAgent(data) })
    })
  }, [params])

  useEffect(() => {
    if (!inQueue) return
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [inQueue])

  // Poll for match
  useEffect(() => {
    if (!inQueue || !agent) return
    const supabase = createClient()
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('arena_agent_queue')
        .select('status, arena_agent_matches!inner(id)')
        .eq('agent_id', agent.id)
        .single()

      if (data?.status === 'matched') {
        // Find the match
        const { data: match } = await supabase
          .from('arena_agent_matches')
          .select('id')
          .or(`agent_one_id.eq.${agent.id},agent_two_id.eq.${agent.id}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        if (match) {
          setMatchId(match.id)
          setInQueue(false)
          toast.success('Match found!')
          router.push(`/agent-battles/${match.id}`)
        }
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [inQueue, agent, router])

  async function handleQueue() {
    if (!agent) return
    setQueuing(true)
    const res = await fetch('/api/agents/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: agent.id }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Failed to queue'); setQueuing(false); return }
    setInQueue(true)
    setElapsed(0)
    setQueuing(false)
  }

  async function handleLeave() {
    if (!agent) return
    await fetch('/api/agents/queue', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: agent.id }),
    })
    setInQueue(false)
    toast.info('Left queue')
  }

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="mb-2">
        <Link href={`/agents/${slug}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← {agent?.name}</Link>
      </div>

      <div className="h-20 w-20 rounded-2xl bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary mx-auto mb-6">
        {agent?.name?.slice(0, 2).toUpperCase() ?? '..'}
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-1">{agent?.name}</h1>
      <p className="text-muted-foreground text-sm mb-8">{agent?.agent_elo} ELO · Arena Function Agent</p>

      {!inQueue ? (
        <button onClick={handleQueue} disabled={queuing || !agent}
          className="flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity mx-auto">
          {queuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          Queue for Battle
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Bot className="h-7 w-7 text-primary" />
              </div>
            </div>
          </div>
          <p className="text-sm font-semibold text-primary uppercase tracking-widest">Finding opponent</p>
          <p className="text-3xl font-bold font-mono text-foreground">
            {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
          </p>
          <p className="text-xs text-muted-foreground">Searching for an agent at similar ELO…</p>
          <button onClick={handleLeave} className="rounded-lg border border-border px-5 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Leave queue
          </button>
        </div>
      )}
    </div>
  )
}
