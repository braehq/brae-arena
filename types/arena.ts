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

// ─── Phase 2 Types ────────────────────────────────────────────────────────────

export type TournamentStatus = 'upcoming' | 'registration' | 'active' | 'complete' | 'cancelled'
export type BracketType = 'single_elimination' | 'double_elimination' | 'round_robin'
export type TournamentMatchStatus = 'pending' | 'waiting_players' | 'active' | 'complete' | 'bye'

export interface ArenaSeason {
  id: string
  name: string
  number: number
  starts_at: string
  ends_at: string
  is_active: boolean
  created_at: string
}

export interface ArenaSeasonRanking {
  id: string
  season_id: string
  user_id: string
  final_elo: number
  final_tier: RankTier
  rank_position: number
  matches_played: number
  wins: number
  losses: number
  created_at: string
  // joined
  profile?: Pick<ArenaProfile, 'username' | 'full_name' | 'avatar_url' | 'country'>
}

export interface ArenaTournament {
  id: string
  slug: string
  name: string
  description: string | null
  season_id: string | null
  game_type: GameType
  bracket_type: BracketType
  max_participants: number
  min_elo: number
  status: TournamentStatus
  registration_ends: string | null
  starts_at: string | null
  prize_description: string | null
  created_by: string | null
  created_at: string
  // computed / joined
  participant_count?: number
}

export interface ArenaTournamentParticipant {
  id: string
  tournament_id: string
  user_id: string
  seed: number | null
  status: 'registered' | 'active' | 'eliminated' | 'winner'
  eliminated_round: number | null
  registered_at: string
  // joined
  profile?: Pick<ArenaProfile, 'username' | 'full_name' | 'avatar_url' | 'arena_elo' | 'arena_rank_tier'>
}

export interface ArenaTournamentMatch {
  id: string
  tournament_id: string
  match_id: string | null
  round: number
  bracket_slot: number
  player_one_id: string | null
  player_two_id: string | null
  winner_id: string | null
  status: TournamentMatchStatus
  created_at: string
  // joined
  player_one?: Pick<ArenaProfile, 'username' | 'full_name' | 'avatar_url' | 'arena_rank_tier'>
  player_two?: Pick<ArenaProfile, 'username' | 'full_name' | 'avatar_url' | 'arena_rank_tier'>
}

export interface ArenaSpectator {
  id: string
  match_id: string
  user_id: string | null
  joined_at: string
  left_at: string | null
}

// ─── Phase 3 Types ────────────────────────────────────────────────────────────

export type TeamRole = 'owner' | 'captain' | 'member'
export type TeamMatchFormat = '2v2' | '3v3'
export type TeamMatchStatus = 'pending' | 'accepted' | 'active' | 'scoring' | 'complete' | 'cancelled' | 'draw'
export type TeamInviteStatus = 'pending' | 'accepted' | 'declined'

export interface ArenaTeam {
  id: string
  slug: string
  name: string
  tag: string
  description: string | null
  avatar_url: string | null
  owner_id: string
  team_elo: number
  team_rank_tier: RankTier
  team_wins: number
  team_losses: number
  team_matches_played: number
  max_members: number
  is_open: boolean
  created_at: string
  // joined
  members?: ArenaTeamMember[]
  member_count?: number
}

export interface ArenaTeamMember {
  id: string
  team_id: string
  user_id: string
  role: TeamRole
  joined_at: string
  // joined
  profile?: Pick<ArenaProfile, 'username' | 'full_name' | 'avatar_url' | 'arena_elo' | 'arena_rank_tier' | 'country'>
}

export interface ArenaTeamInvite {
  id: string
  team_id: string
  invited_by: string
  invitee_id: string
  status: TeamInviteStatus
  created_at: string
  // joined
  team?: Pick<ArenaTeam, 'id' | 'name' | 'tag' | 'slug' | 'avatar_url'>
  inviter?: Pick<ArenaProfile, 'username' | 'full_name'>
}

export interface ArenaTeamMatch {
  id: string
  challenge_id: string
  team_one_id: string
  team_two_id: string
  format: TeamMatchFormat
  status: TeamMatchStatus
  started_at: string | null
  ends_at: string | null
  winner_team_id: string | null
  team_one_score: number | null
  team_two_score: number | null
  elo_change_t1: number | null
  elo_change_t2: number | null
  challenged_by: string | null
  created_at: string
  // joined
  challenge?: ArenaChallenge
  team_one?: Pick<ArenaTeam, 'id' | 'name' | 'tag' | 'slug' | 'avatar_url' | 'team_elo' | 'team_rank_tier'>
  team_two?: Pick<ArenaTeam, 'id' | 'name' | 'tag' | 'slug' | 'avatar_url' | 'team_elo' | 'team_rank_tier'>
  players?: ArenaTeamMatchPlayer[]
}

export interface ArenaTeamMatchPlayer {
  id: string
  team_match_id: string
  team_id: string
  user_id: string
  deployed_url: string | null
  github_url: string | null
  submitted_at: string | null
  score_performance: number | null
  score_accessibility: number | null
  score_best_practices: number | null
  score_seo: number | null
  score_speed_bonus: number | null
  score_total: number | null
  scoring_status: ScoringStatus
  // joined
  profile?: Pick<ArenaProfile, 'username' | 'full_name' | 'avatar_url' | 'arena_rank_tier'>
}

export interface ArenaMatchEvent {
  id: string
  match_id: string
  user_id: string | null
  event_type: 'match_started' | 'player_submitted' | 'scoring_started' | 'scoring_complete' | 'match_complete' | 'player_disconnected'
  payload: Record<string, unknown>
  occurred_at: string
}
