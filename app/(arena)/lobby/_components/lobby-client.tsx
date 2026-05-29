'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { joinQueue } from '@/lib/actions/queue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RankBadge } from '@/components/arena/rank-badge'
import type { GameMode, GameType, RankTier } from '@/types/arena'
import { GAME_TYPE_LABELS } from '@/types/arena'

const GAME_TYPES: GameType[] = ['speed_build', 'clone_battle', 'bug_hunt']
const GAME_TYPE_ICONS: Record<GameType, string> = {
  speed_build: '⚡',
  clone_battle: '🎯',
  bug_hunt: '🐛',
}

interface Props {
  profile: {
    id: string
    username: string | null
    full_name: string | null
    arena_elo: number
    arena_rank_tier: RankTier
    arena_wins: number
    arena_losses: number
    arena_streak: number
    arena_matches_played: number
    total_xp: number
  } | null
  queueCount: number
  topPlayers: Array<{
    id: string
    username: string | null
    full_name: string | null
    arena_elo: number
    arena_rank_tier: RankTier
    arena_wins: number
    arena_losses: number
  }>
}

export function LobbyClient({ profile, queueCount, topPlayers }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<GameMode>('ranked')
  const [gameType, setGameType] = useState<GameType>('speed_build')
  const [loading, setLoading] = useState(false)

  async function handleJoinQueue() {
    setLoading(true)
    const result = await joinQueue(mode, gameType)
    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }
    toast.success('Joined queue — finding your opponent…')
    router.push('/queue')
  }

  const winRate = profile && profile.arena_matches_played > 0
    ? Math.round((profile.arena_wins / profile.arena_matches_played) * 100)
    : 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lobby</h1>
          <p className="text-sm text-muted-foreground">
            {queueCount > 0
              ? `${queueCount} player${queueCount !== 1 ? 's' : ''} in queue`
              : 'No one in queue right now'}
          </p>
        </div>
        {profile && (
          <RankBadge tier={profile.arena_rank_tier} elo={profile.arena_elo} size="md" />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Queue panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 font-semibold text-foreground">Find a match</h2>

            {/* Mode selector */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Mode</p>
              <div className="flex gap-2">
                {(['ranked', 'casual'] as GameMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                      mode === m
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
                    }`}
                  >
                    {m === 'ranked' ? '🏆 Ranked' : '🎮 Casual'}
                  </button>
                ))}
              </div>
              {mode === 'ranked' && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Results affect your ELO rating.
                </p>
              )}
              {mode === 'casual' && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Practice freely — no ELO change.
                </p>
              )}
            </div>

            {/* Game type selector */}
            <div className="mb-6">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Game type</p>
              <div className="grid grid-cols-3 gap-2">
                {GAME_TYPES.map(gt => (
                  <button
                    key={gt}
                    onClick={() => setGameType(gt)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      gameType === gt
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-primary/30'
                    }`}
                  >
                    <span className="text-xl">{GAME_TYPE_ICONS[gt]}</span>
                    <p className={`mt-1 text-xs font-medium ${gameType === gt ? 'text-primary' : 'text-foreground'}`}>
                      {GAME_TYPE_LABELS[gt]}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={handleJoinQueue} disabled={loading} className="w-full" size="lg">
              {loading ? 'Joining queue…' : `Find ${mode} match →`}
            </Button>
          </div>

          {/* Stats */}
          {profile && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Matches', value: profile.arena_matches_played },
                { label: 'Wins', value: profile.arena_wins },
                { label: 'Win Rate', value: `${winRate}%` },
                { label: 'Streak', value: profile.arena_streak > 0 ? `🔥 ${profile.arena_streak}` : profile.arena_streak },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-border bg-card p-3 text-center">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-lg font-bold text-foreground">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mini leaderboard */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Top Players</h2>
            <Link href="/leaderboard" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          <div className="space-y-3">
            {topPlayers.map((player, i) => {
              const name = player.username ?? player.full_name ?? 'Player'
              const wr = (player.arena_wins + player.arena_losses) > 0
                ? Math.round((player.arena_wins / (player.arena_wins + player.arena_losses)) * 100)
                : 0
              return (
                <Link
                  key={player.id}
                  href={`/profile/${player.username ?? player.id}`}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors"
                >
                  <span className="w-5 text-center text-xs font-bold text-muted-foreground">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{name}</p>
                    <p className="text-xs text-muted-foreground">{wr}% win rate</p>
                  </div>
                  <RankBadge tier={player.arena_rank_tier} elo={player.arena_elo} size="sm" showElo={false} />
                </Link>
              )
            })}
            {topPlayers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No ranked players yet.<br />Be the first!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
