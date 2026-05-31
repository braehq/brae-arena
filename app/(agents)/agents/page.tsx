import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { RankBadge } from '@/components/arena/rank-badge'
import { Bot, Trophy, Zap } from 'lucide-react'
import type { RankTier } from '@/types/arena'

export const metadata: Metadata = { title: 'AI Agent Battles' }
export const revalidate = 60

function eloToTier(elo: number): RankTier {
  if (elo >= 2400) return 'mythic'
  if (elo >= 2100) return 'diamond'
  if (elo >= 1800) return 'platinum'
  if (elo >= 1500) return 'gold'
  if (elo >= 1200) return 'silver'
  return 'bronze'
}

export default async function AgentsPage() {
  const service = createServiceClient()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: agents } = await service
    .from('arena_agents')
    .select('id, slug, name, description, agent_elo, wins, losses, matches_played, active, user_id, created_at')
    .eq('active', true)
    .order('agent_elo', { ascending: false })
    .limit(50)

  const ownerIds = [...new Set((agents ?? []).map(a => a.user_id))]
  const { data: owners } = ownerIds.length > 0
    ? await service.from('profiles').select('id, username, full_name, country').in('id', ownerIds)
    : { data: [] }
  const ownerMap = Object.fromEntries((owners ?? []).map(p => [p.id, p]))

  const myAgents = user ? (agents ?? []).filter(a => a.user_id === user.id) : []

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Bot className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">AI Agent Battles</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-lg">
            Write a JavaScript agent function. Arena runs it against another agent on the same challenge.
            The better code wins. Your agent earns ELO.
          </p>
        </div>
        {user && (
          <Link href="/agents/create" className="shrink-0 flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity">
            <Bot className="h-4 w-4" /> Create Agent
          </Link>
        )}
      </div>

      {/* How it works strip */}
      <div className="mb-8 grid grid-cols-3 gap-3">
        {[
          { icon: '✍️', title: 'Write your agent', desc: 'A JS function that receives any challenge and returns code.' },
          { icon: '⚔️', title: 'Agents compete', desc: 'Both agents run simultaneously on the same challenge. Tests decide the winner.' },
          { icon: '📈', title: 'ELO climbs', desc: 'Your agent earns its own ELO separate from your human rank.' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="rounded-xl border border-border bg-card p-4 text-center">
            <span className="text-2xl">{icon}</span>
            <p className="mt-2 text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      {/* My agents */}
      {myAgents.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your Agents</h2>
          <div className="space-y-2">
            {myAgents.map(agent => (
              <div key={agent.id} className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
                <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {agent.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{agent.name}</p>
                  <p className="text-xs text-muted-foreground">{agent.wins}W – {agent.losses}L · {agent.agent_elo} ELO</p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/agents/${agent.slug}`} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">View</Link>
                  <Link href={`/agents/${agent.slug}/queue`} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity flex items-center gap-1">
                    <Zap className="h-3 w-3" /> Queue
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Global leaderboard */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Agent Leaderboard</h2>
        {(!agents || agents.length === 0) ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Bot className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">No agents yet. Be the first to build one.</p>
            {user && (
              <Link href="/agents/create" className="inline-flex rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:opacity-90">
                Create Agent
              </Link>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="divide-y divide-border">
              {(agents ?? []).map((agent, i) => {
                const owner = ownerMap[agent.user_id] as { username?: string; full_name?: string } | null
                const wr = agent.matches_played > 0 ? Math.round((agent.wins / agent.matches_played) * 100) : 0
                return (
                  <Link key={agent.id} href={`/agents/${agent.slug}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors">
                    <span className={`w-7 text-center font-mono text-sm font-bold shrink-0 ${
                      i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-muted-foreground'
                    }`}>#{i + 1}</span>
                    <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {agent.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">
                        by {owner?.username ?? owner?.full_name ?? 'Unknown'} · {wr}% win rate
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Trophy className="h-3 w-3" />{agent.wins}W
                      </span>
                      <RankBadge tier={eloToTier(agent.agent_elo)} size="sm" showElo={false} />
                      <span className="font-mono text-sm font-semibold text-foreground w-14 text-right">{agent.agent_elo}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
