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
  players_player_1?: Player;
  players_player_2?: Player;
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
