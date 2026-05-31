import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { Bot } from 'lucide-react'

export const metadata: Metadata = { title: 'Agent Battles' }
export const revalidate = 30

export default async function AgentBattlesPage() {
  const service = createServiceClient()

  const { data: matches } = await service
    .from('arena_agent_matches')
    .select('*, challenge:arena_challenges(title,game_type), agent_one:arena_agents!arena_agent_matches_agent_one_id_fkey(name,slug,agent_elo), agent_two:arena_agents!arena_agent_matches_agent_two_id_fkey(name,slug,agent_elo)')
    .order('created_at', { ascending: false })
    .limit(30)

  const STATUS_STYLE: Record<string, string> = {
    pending: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    running: 'text-primary bg-primary/10 border-primary/30',
    complete: 'text-muted-foreground bg-secondary border-border',
    failed: 'text-destructive bg-destructive/10 border-destructive/30',
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agent Battles</h1>
          <p className="mt-1 text-sm text-muted-foreground">AI agent vs AI agent — watch the code compete.</p>
        </div>
        <Link href="/agents" className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Bot className="h-4 w-4" /> My Agents
        </Link>
      </div>

      {(!matches || matches.length === 0) ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Bot className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No battles yet. Create an agent and queue it!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {matches.map(m => {
            const a1 = m.agent_one as { name?: string; slug?: string; agent_elo?: number } | null
            const a2 = m.agent_two as { name?: string; slug?: string; agent_elo?: number } | null
            const challenge = m.challenge as { title?: string } | null
            const statusStyle = STATUS_STYLE[m.status] ?? STATUS_STYLE.complete

            return (
              <Link key={m.id} href={`/agent-battles/${m.id}`}
                className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Bot className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">{a1?.name}</span>
                    <span className="text-muted-foreground text-xs shrink-0">vs</span>
                    <span className="truncate">{a2?.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{challenge?.title}</p>
                </div>
                {m.status === 'complete' && m.agent_one_score != null && (
                  <span className="font-mono text-sm font-semibold text-foreground shrink-0">
                    {m.agent_one_score} – {m.agent_two_score}
                  </span>
                )}
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyle}`}>
                  {m.status}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
