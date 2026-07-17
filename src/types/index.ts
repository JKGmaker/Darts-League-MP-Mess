export interface Player {
  id: string;
  name: string;
  created_at: string;
}

export interface Week {
  id: string;
  name: string;
  sequence_order: number;
}

export interface Fixture {
  id: string;
  week_id: string;
  player_1_id: string;
  player_2_id: string;
  player_1_score: number;
  player_2_score: number;
  completed: boolean;
  best_of?: number;
  is_walkover?: boolean;
  players_player_1?: Player;
  players_player_2?: Player;
}

export type Bracket = 'championship' | 'shield';

export interface PlayoffSettings {
  id: number;
  playoffs_locked: boolean;
  seed_snapshot: string[] | null;
  default_best_of: number;
}

export interface PlayoffMatchRow {
  id: string;
  bracket: Bracket;
  code: string;
  best_of: number;
  player_1_score: number;
  player_2_score: number;
  completed: boolean;
  override_player_1_id: string | null;
  override_player_2_id: string | null;
  override_winner_id: string | null;
}

export interface StandingsRow {
  position: number;
  playerId: string;
  name: string;
  played: number;
  won: number;
  lost: number;
  legsWon: number;
  legsLost: number;
  legDifference: number;
  points: number;
}

export interface Leg {
  id: string;
  fixture_id: string;
  leg_number: number;
  winner_id: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface Visit {
  id: string;
  leg_id: string;
  player_id: string;
  score: number;
  darts_used: number;
  is_checkout: boolean;
  remaining_before: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Pool (separate module, own tables — see schema_pool.sql)
// ---------------------------------------------------------------------------

export interface PoolPlayer {
  id: string;
  name: string;
  created_at: string;
}

export type PoolFormat = 'league' | 'knockout';
export type PoolTournamentStatus = 'setup' | 'active' | 'completed';

export interface PoolTournament {
  id: string;
  name: string;
  format: PoolFormat;
  status: PoolTournamentStatus;
  games_per_player: number | null;
  created_at: string;
}

export interface PoolRound {
  id: string;
  tournament_id: string;
  name: string;
  sequence_order: number;
}

export interface PoolFixture {
  id: string;
  round_id: string;
  player_1_id: string;
  player_2_id: string | null;
  player_1_score: number;
  player_2_score: number;
  completed: boolean;
  is_bye: boolean;
}

export interface PoolStandingsRow {
  position: number;
  playerId: string;
  name: string;
  played: number;
  won: number;
  lost: number;
  framesWon: number;
  framesLost: number;
  frameDifference: number;
  points: number;
}

export interface PlayerStat {
  player_id: string;
  player_name: string;
  games_played: number;
  legs_won: number;
  legs_played: number;
  total_score: number;
  total_darts: number;
  three_dart_average: number;
  checkout_attempts: number;
  checkouts_hit: number;
  checkout_percentage: number;
  highest_checkout: number;
  highest_visit: number;
}
