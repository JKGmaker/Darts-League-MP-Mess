import { Fixture, Player, StandingsRow } from '@/types';

/**
 * Calculates league standings from players and completed fixtures.
 * Scoring: Win = 2 Pts, Loss = 0 Pts.
 * Sort Hierarchy: Points → Leg Difference (+/-) → Head-to-Head → Walkover Points → Alphabetical.
 * "Walkover Points" = points a player earned from fixtures marked as walkovers.
 * A player who reaches a tie without relying on walkover wins ranks higher.
 */
export function calculateStandings(players: Player[], fixtures: Fixture[]): StandingsRow[] {
  const stats: Record<string, Omit<StandingsRow, 'position' | 'name'>> = {};
  const walkoverPoints: Record<string, number> = {};

  players.forEach((p) => {
    stats[p.id] = {
      playerId: p.id,
      played: 0,
      won: 0,
      lost: 0,
      legsWon: 0,
      legsLost: 0,
      legDifference: 0,
      points: 0,
    };
    walkoverPoints[p.id] = 0;
  });

  const headToHead: Record<string, Record<string, number>> = {};
  players.forEach((p1) => {
    headToHead[p1.id] = {};
    players.forEach((p2) => {
      headToHead[p1.id][p2.id] = 0;
    });
  });

  fixtures.forEach((f) => {
    if (!f.completed || !stats[f.player_1_id] || !stats[f.player_2_id]) return;

    const p1 = f.player_1_id;
    const p2 = f.player_2_id;
    const s1 = f.player_1_score;
    const s2 = f.player_2_score;

    stats[p1].played += 1;
    stats[p2].played += 1;

    stats[p1].legsWon += s1;
    stats[p1].legsLost += s2;
    stats[p2].legsWon += s2;
    stats[p2].legsLost += s1;

    if (s1 > s2) {
      stats[p1].won += 1;
      stats[p1].points += 2;
      stats[p2].lost += 1;
      headToHead[p1][p2] += 1;
      if (f.is_walkover) walkoverPoints[p1] += 2;
    } else {
      stats[p2].won += 1;
      stats[p2].points += 2;
      stats[p1].lost += 1;
      headToHead[p2][p1] += 1;
      if (f.is_walkover) walkoverPoints[p2] += 2;
    }
  });

  Object.keys(stats).forEach((id) => {
    stats[id].legDifference = stats[id].legsWon - stats[id].legsLost;
  });

  const standings = players.map((p) => ({
    ...stats[p.id],
    name: p.name,
    position: 0,
  }));

  standings.sort((a, b) => {
    // 1. Points
    if (b.points !== a.points) return b.points - a.points;
    // 2. Leg difference (+/-)
    if (b.legDifference !== a.legDifference) return b.legDifference - a.legDifference;
    // 3. Head-to-head (who beat whom directly)
    const aVsB = headToHead[a.playerId]?.[b.playerId] || 0;
    const bVsA = headToHead[b.playerId]?.[a.playerId] || 0;
    if (aVsB !== bVsA) return bVsA - aVsB;
    // 4. Walkover points (fewer walkover-derived points ranks higher)
    const aWo = walkoverPoints[a.playerId] || 0;
    const bWo = walkoverPoints[b.playerId] || 0;
    if (aWo !== bWo) return aWo - bWo;
    // 5. Alphabetical (final fallback)
    return a.name.localeCompare(b.name);
  });

  return standings.map((row, idx) => ({ ...row, position: idx + 1 }));
}
