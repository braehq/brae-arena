import { ImageResponse } from 'next/og'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const TIER_COLORS: Record<string, string> = {
  bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700',
  platinum: '#e5e4e2', diamond: '#b9f2ff', mythic: '#ff6b35',
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const service = createServiceClient()

  const { data: match } = await service
    .from('arena_matches')
    .select('winner_id, status, game_type, mode, elo_change_p1, elo_change_p2, player_one_id, player_two_id, challenge_id')
    .eq('id', id)
    .single()

  if (!match) {
    return new ImageResponse(
      <div style={{ width: 1200, height: 630, background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 40 }}>
        Brae Arena
      </div>,
      { width: 1200, height: 630 }
    )
  }

  const [{ data: p1 }, { data: p2 }, { data: challenge }] = await Promise.all([
    service.from('profiles').select('username, full_name, arena_elo, arena_rank_tier').eq('id', match.player_one_id).single(),
    service.from('profiles').select('username, full_name, arena_elo, arena_rank_tier').eq('id', match.player_two_id).single(),
    service.from('arena_challenges').select('title').eq('id', match.challenge_id).single(),
  ])

  const p1Name = p1?.username ?? p1?.full_name ?? 'Player 1'
  const p2Name = p2?.username ?? p2?.full_name ?? 'Player 2'
  const p1Tier = p1?.arena_rank_tier ?? 'bronze'
  const p2Tier = p2?.arena_rank_tier ?? 'bronze'
  const p1Color = TIER_COLORS[p1Tier] ?? '#6366f1'
  const p2Color = TIER_COLORS[p2Tier] ?? '#6366f1'
  const p1Won = match.winner_id === match.player_one_id
  const p2Won = match.winner_id === match.player_two_id
  const isDraw = match.status === 'draw'
  const e1 = match.elo_change_p1
  const e2 = match.elo_change_p2

  return new ImageResponse(
    <div style={{ width: 1200, height: 630, background: '#0a0a0f', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', padding: 60, justifyContent: 'space-between' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <div style={{ background: '#6366f1', borderRadius: 10, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff' }}>BA</div>
        <span style={{ color: '#6366f1', fontSize: 22, fontWeight: 700 }}>BRAE ARENA</span>
        <span style={{ color: '#52525b', fontSize: 18, marginLeft: 8 }}>1v1 Live Match</span>
      </div>

      {/* Challenge title */}
      <div style={{ color: '#a1a1aa', fontSize: 22, marginBottom: 24 }}>
        {challenge?.title ?? match.game_type.replace(/_/g, ' ')} · {match.mode}
      </div>

      {/* Players VS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 40, flex: 1 }}>
        {/* Player 1 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: p1Color + '25', border: `3px solid ${p1Color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 700, color: p1Color }}>
            {p1Name.slice(0, 2).toUpperCase()}
          </div>
          <span style={{ color: '#f4f4f5', fontSize: 28, fontWeight: 700 }}>{p1Name}</span>
          <span style={{ color: p1Color, fontSize: 18, fontWeight: 600, textTransform: 'capitalize' }}>{p1Tier}</span>
          {e1 != null && (
            <span style={{ color: e1 >= 0 ? '#22c55e' : '#ef4444', fontSize: 24, fontWeight: 700 }}>
              {e1 >= 0 ? '+' : ''}{e1} ELO
            </span>
          )}
          {p1Won && <span style={{ background: '#eab308', color: '#000', borderRadius: 8, padding: '4px 16px', fontSize: 18, fontWeight: 700 }}>🏆 WINNER</span>}
        </div>

        {/* VS divider */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span style={{ color: isDraw ? '#a1a1aa' : '#6366f1', fontSize: 48, fontWeight: 900 }}>
            {isDraw ? 'DRAW' : 'VS'}
          </span>
        </div>

        {/* Player 2 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: p2Color + '25', border: `3px solid ${p2Color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 700, color: p2Color }}>
            {p2Name.slice(0, 2).toUpperCase()}
          </div>
          <span style={{ color: '#f4f4f5', fontSize: 28, fontWeight: 700 }}>{p2Name}</span>
          <span style={{ color: p2Color, fontSize: 18, fontWeight: 600, textTransform: 'capitalize' }}>{p2Tier}</span>
          {e2 != null && (
            <span style={{ color: e2 >= 0 ? '#22c55e' : '#ef4444', fontSize: 24, fontWeight: 700 }}>
              {e2 >= 0 ? '+' : ''}{e2} ELO
            </span>
          )}
          {p2Won && <span style={{ background: '#eab308', color: '#000', borderRadius: 8, padding: '4px 16px', fontSize: 18, fontWeight: 700 }}>🏆 WINNER</span>}
        </div>
      </div>

      {/* Footer */}
      <div style={{ color: '#52525b', fontSize: 18, marginTop: 24 }}>arena.braehq.co</div>
    </div>,
    { width: 1200, height: 630 }
  )
}
