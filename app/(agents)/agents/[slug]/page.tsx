import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { RankBadge } from '@/components/arena/rank-badge'
import { AgentAvatar } from '@/components/arena/agent-avatar'
import { Bot, Trophy, Zap, Edit } from 'lucide-react'
import type { RankTier } from '@/types/arena'

export const metadata: Metadata = { title: 'Agent Profile' }

function eloToTier(elo: number): RankTier {
  if (elo >= 2400) return 'mythic'
  if (elo >= 2100) return 'diamond'
  if (elo >= 1800) return 'platinum'
  if (elo >= 1500) return 'gold'
  if (elo >= 1200) return 'silver'
  return 'bronze'
}

export default async function AgentProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const service = createServiceClient()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: agent } = await service
    .from('arena_agents')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!agent) notFound()

  const isOwner = user?.id === agent.user_id

  const [{ data: owner }, { data: recentMatches }] = await Promise.all([
    service.from('profiles').select('username, full_name, avatar_url').eq('id', agent.user_id).single(),
    service
      .from('arena_agent_matches')
      .select('*, challenge:arena_challenges(title, game_type), agent_one:arena_agents!arena_agent_matches_agent_one_id_fkey(name,slug), agent_two:arena_agents!arena_agent_matches_agent_two_id_fkey(name,slug)')
      .or(`agent_one_id.eq.${agent.id},agent_two_id.eq.${agent.id}`)
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const wr = agent.matches_played > 0 ? Math.round((agent.wins / agent.matches_played) * 100) : 0
  const tier = eloToTier(agent.agent_elo)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-2">
        <Link href="/agents" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Agents</Link>
      </div>

      {/* Agent header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <AgentAvatar
            emoji={(agent as typeof agent & { avatar_emoji?: string }).avatar_emoji ?? '🤖'}
            color={(agent as typeof agent & { color_accent?: string }).color_accent ?? '#6366f1'}
            name={agent.name} size="xl" showRing
          />
          <div>
            <h1 className="text-2xl font-bold text-foreground">{agent.name}</h1>
            {(agent as typeof agent & { personality_tag?: string }).personality_tag && (
              <p className="mt-0.5 text-sm text-muted-foreground italic">
                {(agent as typeof agent & { personality_tag?: string }).personality_tag}
              </p>
            )}
            {agent.description && <p className="mt-0.5 text-sm text-muted-foreground">{agent.description}</p>}
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <RankBadge tier={tier} size="sm" showElo={false} />
              <span className="font-mono font-semibold text-foreground">{agent.agent_elo} ELO</span>
              {(agent as typeof agent & { model_tag?: string }).model_tag && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full border"
                  style={{
                    color: (agent as typeof agent & { color_accent?: string }).color_accent ?? '#6366f1',
                    borderColor: ((agent as typeof agent & { color_accent?: string }).color_accent ?? '#6366f1') + '40',
                    background: ((agent as typeof agent & { color_accent?: string }).color_accent ?? '#6366f1') + '15',
                  }}>
                  {(agent as typeof agent & { model_tag?: string }).model_tag}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                by {(owner as { username?: string; full_name?: string } | null)?.username ?? 'Unknown'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {isOwner && (
            <Link href={`/agents/${slug}/edit`} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Edit className="h-3.5 w-3.5" /> Edit
            </Link>
          )}
          {isOwner && (
            <Link href={`/agents/${slug}/queue`} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
              <Zap className="h-4 w-4" /> Queue Agent
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        {[
          { label: 'Matches', value: agent.matches_played },
          { label: 'Wins', value: agent.wins },
          { label: 'Win Rate', value: `${wr}%` },
          { label: 'ELO', value: agent.agent_elo },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Agent code preview (owner only) */}
      {isOwner && (
        <div className="mb-6 rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agent Code</span>
            <Link href={`/agents/${slug}/edit`} className="text-xs text-primary hover:underline">Edit →</Link>
          </div>
          <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed max-h-48 overflow-y-auto">
            {agent.agent_code}
          </pre>
        </div>
      )}

      {/* Recent matches */}
      <div>
        <h2 className="mb-3 font-semibold text-foreground">Recent Matches</h2>
        {(!recentMatches || recentMatches.length === 0) ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Bot className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No matches yet.</p>
            {isOwner && (
              <Link href={`/agents/${slug}/queue`} className="mt-3 inline-block text-sm text-primary hover:underline">
                Queue for a battle →
              </Link>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {recentMatches.map(m => {
              const isOne = m.agent_one_id === agent.id
              const myScore = isOne ? m.agent_one_score : m.agent_two_score
              const oppScore = isOne ? m.agent_two_score : m.agent_one_score
              const opp = (isOne ? m.agent_two : m.agent_one) as { name?: string; slug?: string } | null
              const won = m.winner_agent_id === agent.id
              const challenge = m.challenge as { title?: string } | null
              const eloChange = isOne ? m.elo_change_one : m.elo_change_two

              return (
                <Link key={m.id} href={`/agent-battles/${m.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors">
                  <span className={`text-lg shrink-0 ${won ? 'text-green-400' : 'text-destructive'}`}>
                    {won ? '▲' : '▼'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{challenge?.title ?? 'Challenge'}</p>
                    <p className="text-xs text-muted-foreground">vs {opp?.name ?? 'Agent'}</p>
                  </div>
                  {myScore != null && <span className="text-sm font-semibold text-foreground">{myScore} – {oppScore}</span>}
                  {eloChange != null && (
                    <span className={`text-xs font-semibold ${eloChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {eloChange >= 0 ? '+' : ''}{eloChange}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
