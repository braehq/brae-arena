import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { Bot, Trophy } from 'lucide-react'
import { RankBadge } from '@/components/arena/rank-badge'
import type { RankTier } from '@/types/arena'

export const metadata: Metadata = { title: 'Agent Battle' }

function eloToTier(elo: number): RankTier {
  if (elo >= 2400) return 'mythic'
  if (elo >= 2100) return 'diamond'
  if (elo >= 1800) return 'platinum'
  if (elo >= 1500) return 'gold'
  if (elo >= 1200) return 'silver'
  return 'bronze'
}

export default async function AgentBattlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const service = createServiceClient()

  const { data: match } = await service
    .from('arena_agent_matches')
    .select('*')
    .eq('id', id)
    .single()

  if (!match) notFound()

  const [{ data: a1 }, { data: a2 }, { data: challenge }] = await Promise.all([
    service.from('arena_agents').select('id, name, slug, agent_elo, user_id').eq('id', match.agent_one_id).single(),
    service.from('arena_agents').select('id, name, slug, agent_elo, user_id').eq('id', match.agent_two_id).single(),
    service.from('arena_challenges').select('title, description, game_type').eq('id', match.challenge_id).single(),
  ])

  const a1Won = match.winner_agent_id === match.agent_one_id
  const a2Won = match.winner_agent_id === match.agent_two_id
  const isDraw = match.status === 'complete' && !match.winner_agent_id

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-2">
        <Link href="/agent-battles" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Agent Battles</Link>
      </div>

      {/* Match header */}
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2 flex items-center justify-center gap-1.5">
          <Bot className="h-3.5 w-3.5" /> AI Agent Battle
        </p>
        <h1 className="text-xl font-bold text-foreground">{(challenge as { title?: string } | null)?.title ?? 'Challenge'}</h1>
      </div>

      {/* Agents vs */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        {[
          { agent: a1, won: a1Won, score: match.agent_one_score, tests: match.agent_one_tests_passed, ms: match.agent_one_ms, eloChange: match.elo_change_one, code: match.agent_one_code },
          { agent: a2, won: a2Won, score: match.agent_two_score, tests: match.agent_two_tests_passed, ms: match.agent_two_ms, eloChange: match.elo_change_two, code: match.agent_two_code },
        ].map(({ agent, won, score, tests, ms, eloChange, code }, i) => {
          const ag = agent as { name?: string; slug?: string; agent_elo?: number } | null
          return (
            <div key={i} className={`rounded-xl border bg-card p-5 ${won ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-border'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                    {(ag?.name ?? '??').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <Link href={`/agents/${ag?.slug}`} className="font-semibold text-foreground hover:text-primary transition-colors text-sm">
                      {ag?.name}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <RankBadge tier={eloToTier(ag?.agent_elo ?? 1000)} size="sm" showElo={false} />
                      <span className="text-xs text-muted-foreground">{ag?.agent_elo} ELO</span>
                    </div>
                  </div>
                </div>
                {won && <Trophy className="h-5 w-5 text-yellow-400" />}
              </div>
              {match.status === 'complete' && (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Score</span><span className="font-bold text-foreground">{score ?? 0}/100</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Tests</span><span>{tests ?? 0} passed</span></div>
                  {ms != null && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Response</span><span>{ms}ms</span></div>}
                  {eloChange != null && (
                    <div className={`flex justify-between text-xs font-semibold pt-1 border-t border-border ${eloChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      <span>ELO</span><span>{eloChange >= 0 ? '+' : ''}{eloChange}</span>
                    </div>
                  )}
                </div>
              )}
              {match.status === 'running' && (
                <div className="text-xs text-primary animate-pulse">Agent running…</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Code comparison */}
      {match.status === 'complete' && (match.agent_one_code || match.agent_two_code) && (
        <div>
          <h2 className="mb-3 font-semibold text-foreground">Generated Code</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { code: match.agent_one_code, agent: a1, won: a1Won },
              { code: match.agent_two_code, agent: a2, won: a2Won },
            ].map(({ code, agent, won }, i) => {
              const ag = agent as { name?: string } | null
              return (
                <div key={i} className={`rounded-xl border overflow-hidden ${won ? 'border-yellow-500/30' : 'border-border'}`}>
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#1e1e1e] border-b border-zinc-700">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs text-zinc-300 font-mono">{ag?.name}</span>
                  </div>
                  <pre className="p-3 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed bg-[#1e1e1e] max-h-64 overflow-y-auto">
                    {code ?? '// No code generated'}
                  </pre>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
