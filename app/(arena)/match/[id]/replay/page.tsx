import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Match Replay' }

export default async function ReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const [{ data: rawMatch }, { data: events }, { data: submissions }] = await Promise.all([
    supabase.from('arena_matches').select('*, challenge_id, player_one_id, player_two_id').eq('id', id).single(),
    supabase.from('arena_match_events').select('*').eq('match_id', id).order('occurred_at', { ascending: true }),
    supabase.from('arena_submissions').select('*').eq('match_id', id),
  ])

  if (!rawMatch) notFound()

  const [{ data: challengeRow }, { data: p1Profile }, { data: p2Profile }] = await Promise.all([
    supabase.from('arena_challenges').select('title').eq('id', rawMatch.challenge_id).single(),
    supabase.from('profiles').select('username, full_name').eq('id', rawMatch.player_one_id).single(),
    supabase.from('profiles').select('username, full_name').eq('id', rawMatch.player_two_id).single(),
  ])

  const match = { ...rawMatch, challenge: challengeRow, player_one: p1Profile, player_two: p2Profile }
  if (match.status !== 'complete') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-muted-foreground">Replay is available after a match completes.</p>
        <Link href={`/match/${id}`} className="mt-4 inline-block text-sm text-primary hover:underline">Go to match →</Link>
      </div>
    )
  }

  const p1 = match.player_one as { username?: string; full_name?: string } | null
  const p2 = match.player_two as { username?: string; full_name?: string } | null
  const p1Sub = (submissions ?? []).find(s => s.user_id === match.player_one_id)
  const p2Sub = (submissions ?? []).find(s => s.user_id === match.player_two_id)
  const challenge = match.challenge as { title?: string } | null

  const matchDuration = match.started_at && match.ends_at
    ? Math.round((new Date(match.ends_at).getTime() - new Date(match.started_at).getTime()) / 60000)
    : null

  const EVENT_LABELS: Record<string, string> = {
    match_started: '🚀 Match started',
    player_submitted: '📤 Player submitted',
    scoring_started: '⏳ Scoring started',
    scoring_complete: '✅ Scoring complete',
    match_complete: '🏆 Match complete',
    player_disconnected: '⚠️ Player disconnected',
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-2">
        <Link href="/history" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Match History</Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Match Replay</h1>
        {challenge && <p className="mt-1 text-sm text-muted-foreground">{challenge.title}</p>}
      </div>

      {/* Result card */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        {[
          { player: p1, sub: p1Sub, isWinner: match.winner_id === match.player_one_id, eloChange: match.elo_change_p1 },
          { player: p2, sub: p2Sub, isWinner: match.winner_id === match.player_two_id, eloChange: match.elo_change_p2 },
        ].map(({ player, sub, isWinner, eloChange }, i) => (
          <div key={i} className={`rounded-xl border bg-card p-4 ${isWinner ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-border'}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-foreground">{player?.username ?? player?.full_name ?? 'Player'}</p>
              {isWinner && <span className="text-xs font-bold text-yellow-400">WINNER</span>}
            </div>
            {sub && sub.score_total != null ? (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Score</span><span className="font-bold text-foreground">{sub.score_total}</span></div>
                {/* Code challenge — show test results */}
                {sub.tests_total != null ? (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Tests Passed</span>
                      <span className={sub.tests_passed === sub.tests_total ? 'text-green-400 font-semibold' : 'text-amber-400'}>
                        {sub.tests_passed ?? 0}/{sub.tests_total}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Test Score</span><span>{Math.round(((sub.tests_passed ?? 0) / sub.tests_total) * 80)}/80</span></div>
                  </>
                ) : (
                  /* URL submit challenge — show Lighthouse metrics */
                  <>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Performance</span><span>{sub.score_performance ?? '—'}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Accessibility</span><span>{sub.score_accessibility ?? '—'}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Best Practices</span><span>{sub.score_best_practices ?? '—'}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">SEO</span><span>{sub.score_seo ?? '—'}</span></div>
                  </>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Speed Bonus</span>
                  <span>{(sub.score_speed_bonus ?? 0) > 0 ? `+${sub.score_speed_bonus}` : '+0'}</span>
                </div>
                {eloChange != null && (
                  <div className={`flex justify-between text-xs font-semibold pt-1 border-t border-border ${eloChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    <span>ELO</span><span>{eloChange >= 0 ? '+' : ''}{eloChange}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No submission</p>
            )}
          </div>
        ))}
      </div>

      {/* Match info */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4 text-sm">
        <div className="grid grid-cols-2 gap-3 text-muted-foreground">
          {match.started_at && <div><span className="text-foreground font-medium">Started: </span>{new Date(match.started_at).toLocaleString()}</div>}
          {matchDuration && <div><span className="text-foreground font-medium">Duration: </span>{matchDuration} min</div>}
          <div><span className="text-foreground font-medium">Mode: </span>{match.mode}</div>
          <div><span className="text-foreground font-medium">Type: </span>{match.game_type.replace(/_/g, ' ')}</div>
        </div>
      </div>

      {/* Event timeline */}
      <div>
        <h2 className="mb-3 font-semibold text-foreground">Match Timeline</h2>
        {(events ?? []).length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No event log recorded for this match.
          </div>
        ) : (
          <div className="relative pl-4 border-l border-border space-y-4">
            {(events ?? []).map((event) => {
              const payload = event.payload as Record<string, unknown>
              const playerName = event.user_id === match.player_one_id
                ? (p1?.username ?? p1?.full_name ?? 'Player 1')
                : event.user_id === match.player_two_id
                ? (p2?.username ?? p2?.full_name ?? 'Player 2')
                : null

              return (
                <div key={event.id} className="relative">
                  <div className="absolute -left-[1.375rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {EVENT_LABELS[event.event_type] ?? event.event_type}
                      {playerName && <span className="ml-1 text-muted-foreground">— {playerName}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.occurred_at).toLocaleTimeString()}
                    </p>
                    {payload.score_total != null && (
                      <p className="text-xs text-muted-foreground">Score: {String(payload.score_total)}</p>
                    )}
                    {typeof payload.url === 'string' && (
                      <a href={payload.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">{payload.url}</a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
