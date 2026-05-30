import type { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getTodayUTC, pickDailyChallenge, formatDailyDate } from '@/lib/daily-challenge'
import { DailyChallenge } from './_components/daily-challenge'
import { DailyLeaderboard } from './_components/daily-leaderboard'

export const metadata: Metadata = { title: 'Daily Challenge' }
export const revalidate = 60

export default async function DailyPage() {
  const service = createServiceClient()
  const today = getTodayUTC()

  // Fetch all active code_duel challenges as the daily pool
  const { data: pool } = await service
    .from('arena_challenges')
    .select('id, slug, title, description, starter_code, language, test_cases, difficulty')
    .eq('active', true)
    .eq('challenge_type', 'code_duel')
    .order('created_at')

  if (!pool || pool.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-muted-foreground">No daily challenge available yet.</p>
      </div>
    )
  }

  const challenge = pickDailyChallenge(pool, today)

  // Today's leaderboard
  const { data: leaderboard } = await service
    .from('arena_daily_attempts')
    .select('user_id, score, tests_passed, tests_total, submitted_at, attempts')
    .eq('date', today)
    .eq('challenge_id', challenge.id)
    .order('score', { ascending: false })
    .order('submitted_at', { ascending: true })
    .limit(20)

  // Fetch profiles for leaderboard
  const userIds = (leaderboard ?? []).map(r => r.user_id)
  const { data: profiles } = userIds.length > 0
    ? await service.from('profiles').select('id, username, full_name, avatar_url, country, arena_rank_tier').in('id', userIds)
    : { data: [] }

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
  const enrichedLeaderboard = (leaderboard ?? []).map(r => ({
    ...r,
    profile: profileMap[r.user_id] ?? null,
  }))

  // Current user's attempt
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const myAttempt = user
    ? (leaderboard ?? []).find(r => r.user_id === user.id) ?? null
    : null

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-xs font-semibold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Daily Challenge
            </span>
            <span className="text-xs text-muted-foreground">{formatDailyDate(today)}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{challenge.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everyone gets the same challenge today. Resets at midnight UTC. Top score wins the day.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-muted-foreground">Participants today</p>
          <p className="text-2xl font-bold text-foreground">{enrichedLeaderboard.length}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Editor — takes 2/3 width */}
        <div className="lg:col-span-2">
          <DailyChallenge
            challenge={challenge}
            today={today}
            myAttempt={myAttempt}
            userId={user?.id ?? null}
          />
        </div>

        {/* Leaderboard — takes 1/3 width */}
        <div>
          <DailyLeaderboard entries={enrichedLeaderboard} userId={user?.id ?? null} />
        </div>
      </div>
    </div>
  )
}
