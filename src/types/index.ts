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
  excluded: boolean;
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
  playoff_after_weeks: number | null;
  playoffs_generated: boolean;
  created_at: string;
}

export type PoolRoundStage = 'league' | 'playoff';

export interface PoolRound {
  id: string;
  tournament_id: string;
  name: string;
  stage: PoolRoundStage;
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
  slot_code: string | null;
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

// ---------------------------------------------------------------------------
// One-Day Tournament (separate module, own tables — see
// schema_day_tournament.sql). A single-event knockout that can run for
// either Darts or Pool, singles or doubles, with an optional "pots" draw.
// ---------------------------------------------------------------------------

export type DayTournamentSport = 'darts' | 'pool';
export type DayTournamentMode = 'singles' | 'doubles';
export type DayTournamentPotMode = 'single' | 'multiple';
export type DayTournamentStatus = 'setup' | 'paired' | 'active' | 'completed';

export interface DayTournament {
  id: string;
  name: string;
  event_date: string | null;
  sport: DayTournamentSport;
  mode: DayTournamentMode;
  format: 'knockout';
  legs_per_game: number;
  pot_mode: DayTournamentPotMode;
  pot_count: number;
  status: DayTournamentStatus;
  created_at: string;
}

export interface DayTournamentEntrant {
  id: string;
  tournament_id: string;
  name: string;
  pot_number: number;
  created_at: string;
}

export interface DayTournamentCompetitor {
  id: string;
  tournament_id: string;
  display_name: string;
  entrant_1_id: string;
  entrant_2_id: string | null;
  pot_number: number | null;
  created_at: string;
}

export interface DayTournamentRound {
  id: string;
  tournament_id: string;
  name: string;
  sequence_order: number;
  created_at: string;
}

export interface DayTournamentFixture {
  id: string;
  round_id: string;
  competitor_1_id: string;
  competitor_2_id: string | null;
  competitor_1_legs: number;
  competitor_2_legs: number;
  completed: boolean;
  is_bye: boolean;
  created_at: string;
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
