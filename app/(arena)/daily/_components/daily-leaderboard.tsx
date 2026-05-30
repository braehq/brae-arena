'use client'

import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { RankBadge } from '@/components/arena/rank-badge'
import { countryFlag } from '@/lib/country-flag'
import type { RankTier } from '@/types/arena'

interface Entry {
  user_id: string
  score: number
  tests_passed: number
  tests_total: number
  submitted_at: string
  attempts: number
  profile: {
    username: string | null
    full_name: string | null
    avatar_url: string | null
    country: string | null
    arena_rank_tier: string
  } | null
}

interface Props {
  entries: Entry[]
  userId: string | null
}

export function DailyLeaderboard({ entries, userId }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="font-semibold text-foreground">Today's Leaderboard</h2>
        <span className="text-xs text-muted-foreground">{entries.length} players</span>
      </div>

      {entries.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <Trophy className="mx-auto h-7 w-7 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No attempts yet today.</p>
          <p className="text-xs text-muted-foreground mt-1">Be the first on the board!</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {entries.map((entry, i) => {
            const isMe = entry.user_id === userId
            const name = entry.profile?.username ?? entry.profile?.full_name ?? 'Player'
            const isPerfect = entry.score === 100
            const time = new Date(entry.submitted_at).toLocaleTimeString('en-GB', {
              hour: '2-digit', minute: '2-digit',
            })

            return (
              <div key={entry.user_id} className={`flex items-center gap-3 px-4 py-3 ${
                isMe ? 'bg-primary/5 border-l-2 border-primary' : ''
              }`}>
                {/* Rank number */}
                <span className={`w-6 text-center font-mono text-sm font-bold shrink-0 ${
                  i === 0 ? 'text-yellow-400' :
                  i === 1 ? 'text-slate-300' :
                  i === 2 ? 'text-amber-600' : 'text-muted-foreground'
                }`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>

                {/* Avatar */}
                {entry.profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.profile.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                    {name.slice(0, 1).toUpperCase()}
                  </div>
                )}

                {/* Name + flag */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <Link href={`/profile/${entry.profile?.username ?? entry.user_id}`}
                      className="truncate text-sm font-medium text-foreground hover:text-primary transition-colors">
                      {name}
                    </Link>
                    {entry.profile?.country && (
                      <span className="text-sm shrink-0">{countryFlag(entry.profile.country)}</span>
                    )}
                    {isMe && <span className="text-[10px] text-primary font-semibold shrink-0">(you)</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <RankBadge tier={entry.profile?.arena_rank_tier as RankTier ?? 'bronze'} size="sm" showElo={false} />
                    <span>{time}</span>
                    {entry.attempts > 1 && <span>{entry.attempts} tries</span>}
                  </div>
                </div>

                {/* Score */}
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${isPerfect ? 'text-green-400' : 'text-foreground'}`}>
                    {entry.score}
                    <span className="text-xs font-normal text-muted-foreground">/100</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.tests_passed}/{entry.tests_total}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground text-center">
        Resets midnight UTC · Score = % tests passing
      </div>
    </div>
  )
}
