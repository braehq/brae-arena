import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { RankBadge } from '@/components/arena/rank-badge'
import { Bot, Trophy, Zap, Plus, Swords, Clock } from 'lucide-react'
import type { RankTier } from '@/types/arena'

export const metadata: Metadata = { title: 'AI Agent Battles' }
export const revalidate = 30

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

  const [{ data: agents }, { data: recentBattles }] = await Promise.all([
    service
      .from('arena_agents')
      .select('id, slug, name, description, agent_elo, wins, losses, matches_played, active, user_id')
      .eq('active', true)
      .order('agent_elo', { ascending: false })
      .limit(50),
    service
      .from('arena_agent_matches')
      .select('id, status, created_at, winner_agent_id, agent_one_score, agent_two_score, agent_one:arena_agents!arena_agent_matches_agent_one_id_fkey(name,slug), agent_two:arena_agents!arena_agent_matches_agent_two_id_fkey(name,slug), challenge:arena_challenges(title)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const ownerIds = [...new Set((agents ?? []).map(a => a.user_id))]
  const { data: owners } = ownerIds.length > 0
    ? await service.from('profiles').select('id, username, full_name').in('id', ownerIds)
    : { data: [] }
  const ownerMap = Object.fromEntries((owners ?? []).map(p => [p.id, p]))

  const myAgents = user ? (agents ?? []).filter(a => a.user_id === user.id) : []
  const globalAgents = (agents ?? []).filter(a => !user || a.user_id !== user.id)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI Agent Battles</h1>
            <p className="text-sm text-muted-foreground">Write a JS function. It competes for you. Earns its own ELO.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── Left column (2/3) ───────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* MY AGENTS — prominent, with queue button right here */}
          {user ? (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-foreground">Your Agents</h2>
                <Link href="/agents/create"
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
                  <Plus className="h-3.5 w-3.5" /> New Agent
                </Link>
              </div>

              {myAgents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                  <Bot className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">No agents yet</p>
                  <p className="text-xs text-muted-foreground mb-4">Write a JavaScript function and let it compete for you.</p>
                  <Link href="/agents/create"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity">
                    <Bot className="h-4 w-4" /> Create your first agent
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {myAgents.map(agent => {
                    const wr = agent.matches_played > 0 ? Math.round((agent.wins / agent.matches_played) * 100) : 0
                    return (
                      <div key={agent.id} className="rounded-xl border border-primary/20 bg-card overflow-hidden">
                        {/* Agent info row */}
                        <div className="flex items-center gap-4 px-4 py-4">
                          <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center text-base font-bold text-primary shrink-0">
                            {agent.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <Link href={`/agents/${agent.slug}`} className="font-semibold text-foreground hover:text-primary transition-colors truncate">
                                {agent.name}
                              </Link>
                              <RankBadge tier={eloToTier(agent.agent_elo)} size="sm" showElo={false} />
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="font-mono font-semibold text-foreground">{agent.agent_elo} ELO</span>
                              <span>{agent.wins}W – {agent.losses}L</span>
                              {agent.matches_played > 0 && <span>{wr}% win rate</span>}
                            </div>
                          </div>
                          {/* Queue button — right here, no need to navigate away */}
                          <Link href={`/agents/${agent.slug}/queue`}
                            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity shrink-0">
                            <Zap className="h-4 w-4" />
                            Queue Battle
                          </Link>
                        </div>
                        {/* Quick actions footer */}
                        <div className="flex border-t border-border divide-x divide-border">
                          <Link href={`/agents/${agent.slug}`} className="flex-1 py-2 text-center text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors">
                            View Profile
                          </Link>
                          <Link href={`/agents/${agent.slug}/edit`} className="flex-1 py-2 text-center text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors">
                            Edit Code
                          </Link>
                          <Link href="/agent-battles" className="flex-1 py-2 text-center text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors">
                            Match History
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          ) : (
            /* Not logged in — clear CTA */
            <section className="rounded-xl border border-primary/20 bg-primary/5 p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground mb-1">Build your AI agent</h2>
                  <p className="text-sm text-muted-foreground mb-4">Write a JavaScript function that solves coding challenges. Queue it against other agents. Climb the ELO ladder.</p>
                  <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
                    Get started free
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* GLOBAL LEADERBOARD */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground">Agent Leaderboard</h2>
              <span className="text-xs text-muted-foreground">{(agents ?? []).length} agents</span>
            </div>

            {globalAgents.length === 0 && myAgents.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <p className="text-muted-foreground text-sm">No agents yet. Be the first to build one.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="divide-y divide-border">
                  {(agents ?? []).map((agent, i) => {
                    const owner = ownerMap[agent.user_id] as { username?: string; full_name?: string } | null
                    const isMe = user?.id === agent.user_id
                    const wr = agent.matches_played > 0 ? Math.round((agent.wins / agent.matches_played) * 100) : 0
                    return (
                      <Link key={agent.id} href={`/agents/${agent.slug}`}
                        className={`flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors ${isMe ? 'bg-primary/5 border-l-2 border-primary' : ''}`}>
                        <span className={`w-7 text-center font-mono text-sm font-bold shrink-0 ${
                          i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-muted-foreground'
                        }`}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                        </span>
                        <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {agent.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-foreground truncate">{agent.name}</p>
                            {isMe && <span className="text-[10px] text-primary font-semibold">(you)</span>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            by {owner?.username ?? owner?.full_name ?? 'Unknown'} · {wr}% win rate
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Trophy className="h-3 w-3" />{agent.wins}W
                          </span>
                          <RankBadge tier={eloToTier(agent.agent_elo)} size="sm" showElo={false} />
                          <span className="font-mono text-sm font-semibold text-foreground w-12 text-right">{agent.agent_elo}</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── Right column (1/3) ───────────────────────────── */}
        <div className="space-y-5">

          {/* How it works */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-semibold text-foreground mb-3 text-sm">How it works</h3>
            <div className="space-y-3">
              {[
                { n: '1', title: 'Write your agent', desc: 'A JS function that receives any challenge and returns code.' },
                { n: '2', title: 'Queue it', desc: 'Click "Queue Battle" — Arena finds an opponent at similar ELO.' },
                { n: '3', title: 'Both agents run', desc: 'Same challenge, same test runner, simultaneously. Better code wins.' },
                { n: '4', title: 'ELO updates', desc: 'Agent ELO is separate from your human rank.' },
              ].map(({ n, title, desc }) => (
                <div key={n} className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary mt-0.5">{n}</span>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent battles */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Recent Battles</h3>
              <Link href="/agent-battles" className="text-xs text-primary hover:underline">View all →</Link>
            </div>
            {(!recentBattles || recentBattles.length === 0) ? (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">No battles yet</div>
            ) : (
              <div className="divide-y divide-border">
                {recentBattles.map(b => {
                  const a1 = b.agent_one as { name?: string; slug?: string } | null
                  const a2 = b.agent_two as { name?: string; slug?: string } | null
                  const ch = b.challenge as { title?: string } | null
                  const time = new Date(b.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <Link key={b.id} href={`/agent-battles/${b.id}`}
                      className="flex items-center gap-2 px-4 py-2.5 hover:bg-secondary/20 transition-colors">
                      <Swords className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {a1?.name} vs {a2?.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">{ch?.title}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {b.status === 'complete' && b.agent_one_score != null && (
                          <p className="text-xs font-mono text-foreground">{b.agent_one_score}–{b.agent_two_score}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 justify-end">
                          <Clock className="h-2.5 w-2.5" />{time}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Agent sandbox rules */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-xs font-semibold text-amber-300 mb-2">Sandbox rules</p>
            <ul className="space-y-1 text-xs text-amber-200/70">
              <li>• Define <code className="font-mono text-amber-300">function agent(challenge)</code></li>
              <li>• Return a string (the solution code)</li>
              <li>• No fetch / HTTP calls allowed</li>
              <li>• No require / import allowed</li>
              <li>• 10 second execution timeout</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
