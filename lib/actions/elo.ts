import type { EloResult, RankTier } from '@/types/arena'
import { RANK_TIERS } from '@/types/arena'

export function getTierFromElo(elo: number): RankTier {
  for (const [tier, { min, max }] of Object.entries(RANK_TIERS)) {
    if (elo >= min && elo <= max) return tier as RankTier
  }
  return 'bronze'
}

function getKFactor(gamesPlayed: number): number {
  if (gamesPlayed < 30) return 32
  if (gamesPlayed < 100) return 24
  return 16
}

export function calculateElo(
  playerElo: number,
  opponentElo: number,
  result: 'win' | 'loss' | 'draw',
  gamesPlayed: number
): EloResult {
  const K = getKFactor(gamesPlayed)
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400))
  const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0
  const change = Math.round(K * (score - expected))
  const newElo = Math.max(0, playerElo + change)
  return { newElo, change, newTier: getTierFromElo(newElo) }
}

export function calculateXpAward(
  result: 'win' | 'loss' | 'draw',
  mode: 'ranked' | 'casual',
  streak: number,
  perfectScore: boolean
): number {
  let xp = 25 // participation
  if (result === 'win') xp += mode === 'ranked' ? 100 : 50
  if (perfectScore) xp += 200
  if (result === 'win') {
    if (streak >= 10) xp += 750
    else if (streak >= 5) xp += 300
    else if (streak >= 3) xp += 150
  }
  return xp
}
