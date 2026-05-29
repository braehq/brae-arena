export type RankTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'mythic'
export type GameMode = 'ranked' | 'casual'
export type GameType = 'speed_build' | 'clone_battle' | 'bug_hunt'
export type MatchStatus = 'pending' | 'active' | 'scoring' | 'complete' | 'cancelled' | 'draw'
export type QueueStatus = 'waiting' | 'matched' | 'cancelled'
export type ScoringStatus = 'pending' | 'running' | 'complete' | 'failed'
export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme'

export interface ArenaProfile {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  country: string | null
  total_xp: number
  arena_elo: number
  arena_rank_tier: RankTier
  arena_wins: number
  arena_losses: number
  arena_streak: number
  arena_matches_played: number
}

export interface ArenaChallenge {
  id: string
  slug: string
  title: string
  description: string
  mode: GameType
  difficulty: Difficulty
  time_limit_mins: number
  reference_url: string | null
  starter_repo: string | null
  scoring_weights: ScoringWeights
  active: boolean
  created_at: string
}

export interface ScoringWeights {
  deployment_success: number
  lighthouse_performance: number
  lighthouse_accessibility: number
  lighthouse_best_practices: number
  lighthouse_seo: number
  speed_bonus: number
}

export interface ArenaQueue {
  id: string
  user_id: string
  mode: GameMode
  game_type: GameType
  elo: number
  joined_at: string
  status: QueueStatus
  match_id: string | null
}

export interface ArenaMatch {
  id: string
  challenge_id: string
  player_one_id: string
  player_two_id: string
  mode: GameMode
  game_type: GameType
  status: MatchStatus
  started_at: string | null
  ends_at: string | null
  winner_id: string | null
  elo_change_p1: number | null
  elo_change_p2: number | null
  xp_awarded_p1: number | null
  xp_awarded_p2: number | null
  created_at: string
  // joined
  challenge?: ArenaChallenge
  player_one?: ArenaProfile
  player_two?: ArenaProfile
}

export interface ArenaSubmission {
  id: string
  match_id: string
  user_id: string
  deployed_url: string
  github_url: string | null
  submitted_at: string
  score_performance: number | null
  score_accessibility: number | null
  score_best_practices: number | null
  score_seo: number | null
  score_speed_bonus: number | null
  score_total: number | null
  scoring_status: ScoringStatus
  error_message: string | null
}

export interface EloResult {
  newElo: number
  change: number
  newTier: RankTier
}

export const RANK_TIERS: Record<RankTier, { min: number; max: number; color: string; label: string }> = {
  bronze:   { min: 0,    max: 1199, color: '#cd7f32', label: 'Bronze'   },
  silver:   { min: 1200, max: 1499, color: '#c0c0c0', label: 'Silver'   },
  gold:     { min: 1500, max: 1799, color: '#ffd700', label: 'Gold'     },
  platinum: { min: 1800, max: 2099, color: '#e5e4e2', label: 'Platinum' },
  diamond:  { min: 2100, max: 2399, color: '#b9f2ff', label: 'Diamond'  },
  mythic:   { min: 2400, max: Infinity, color: '#ff6b35', label: 'Mythic' },
}

export const GAME_TYPE_LABELS: Record<GameType, string> = {
  speed_build:  'Speed Build',
  clone_battle: 'Clone Battle',
  bug_hunt:     'Bug Hunt',
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy:    'Easy',
  medium:  'Medium',
  hard:    'Hard',
  extreme: 'Extreme',
}
