import { PoolFixture, PoolPlayer, PoolStandingsRow } from '@/types';

/**
 * Calculates league standings for a pool league-format tournament, from the
 * roster entered into that tournament and its completed fixtures.
 * Scoring: Win = 2 Pts, Loss = 0 Pts.
 * Sort Hierarchy: Points → Frame difference (+/-) → Head-to-head → Alphabetical.
 * Mirrors the darts calculateStandings in lib/utils.ts, adapted for pool's
 * player/fixture shape.
 */
export function calculatePoolStandings(
  players: PoolPlayer[],
  fixtures: PoolFixture[]
): PoolStandingsRow[] {
  const stats: Record<string, Omit<PoolStandingsRow, 'position' | 'name'>> = {};

  players.forEach((p) => {
    stats[p.id] = {
      playerId: p.id,
      played: 0,
      won: 0,
      lost: 0,
      framesWon: 0,
      framesLost: 0,
      frameDifference: 0,
      points: 0,
    };
  });

  const headToHead: Record<string, Record<string, number>> = {};
  players.forEach((p1) => {
    headToHead[p1.id] = {};
    players.forEach((p2) => {
      headToHead[p1.id][p2.id] = 0;
    });
  });

  fixtures.forEach((f) => {
    if (f.is_bye || !f.completed || !f.player_2_id) return;
    if (!stats[f.player_1_id] || !stats[f.player_2_id]) return;

    const p1 = f.player_1_id;
    const p2 = f.player_2_id;
    const s1 = f.player_1_score;
    const s2 = f.player_2_score;

    stats[p1].played += 1;
    stats[p2].played += 1;

    stats[p1].framesWon += s1;
    stats[p1].framesLost += s2;
    stats[p2].framesWon += s2;
    stats[p2].framesLost += s1;

    if (s1 > s2) {
      stats[p1].won += 1;
      stats[p1].points += 2;
      stats[p2].lost += 1;
      headToHead[p1][p2] += 1;
    } else {
      stats[p2].won += 1;
      stats[p2].points += 2;
      stats[p1].lost += 1;
      headToHead[p2][p1] += 1;
    }
  });

  Object.keys(stats).forEach((id) => {
    stats[id].frameDifference = stats[id].framesWon - stats[id].framesLost;
  });

  const standings = players.map((p) => ({
    ...stats[p.id],
    name: p.name,
    position: 0,
  }));

  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.frameDifference !== a.frameDifference) return b.frameDifference - a.frameDifference;
    const aVsB = headToHead[a.playerId]?.[b.playerId] || 0;
    const bVsA = headToHead[b.playerId]?.[a.playerId] || 0;
    if (aVsB !== bVsA) return bVsA - aVsB;
    return a.name.localeCompare(b.name);
  });

  return standings.map((row, idx) => ({ ...row, position: idx + 1 }));
}

/** Returns the winner's player id for a completed, non-bye fixture. */
export function fixtureWinnerId(f: PoolFixture): string | null {
  if (f.is_bye) return f.player_1_id;
  if (!f.completed || !f.player_2_id) return null;
  return f.player_1_score > f.player_2_score ? f.player_1_id : f.player_2_id;
}
