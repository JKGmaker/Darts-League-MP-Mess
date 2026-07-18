import { PoolFixture, PoolPlayer, PoolRound, PoolStandingsRow } from '@/types';

/**
 * Calculates league standings for a pool league-format tournament, from the
 * roster entered into that tournament and its completed fixtures.
 * Scoring: Win = 2 Pts, Loss = 0 Pts. A bye week (odd headcount) counts as a
 * walkover win for the player sitting out — 2 pts, no frames either way.
 * Sort Hierarchy: Points → Frame difference (+/-) → Head-to-head →
 * fewest walkover-derived points (so a run of byes doesn't outrank a tied
 * player who earned their points at the table) → Alphabetical.
 * Mirrors the darts calculateStandings in lib/utils.ts, adapted for pool's
 * player/fixture shape.
 */
export function calculatePoolStandings(
  players: PoolPlayer[],
  fixtures: PoolFixture[]
): PoolStandingsRow[] {
  const stats: Record<string, Omit<PoolStandingsRow, 'position' | 'name'>> = {};
  const walkoverPoints: Record<string, number> = {};

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
    if (!f.completed) return;

    // Bye week — the sitting-out player gets a walkover win, no frames.
    if (f.is_bye) {
      if (!stats[f.player_1_id]) return;
      stats[f.player_1_id].played += 1;
      stats[f.player_1_id].won += 1;
      stats[f.player_1_id].points += 2;
      walkoverPoints[f.player_1_id] += 2;
      return;
    }

    if (!f.player_2_id) return;
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
    const aWo = walkoverPoints[a.playerId] || 0;
    const bWo = walkoverPoints[b.playerId] || 0;
    if (aWo !== bWo) return aWo - bWo;
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

/** Splits a tournament's fixtures into league-stage vs playoff-stage, using
 * each fixture's round. League standings must only ever be calculated from
 * the league-stage half — playoff results are knockout, not round-robin. */
export function splitFixturesByStage(
  rounds: PoolRound[],
  fixtures: PoolFixture[]
): { leagueFixtures: PoolFixture[]; playoffFixtures: PoolFixture[]; leagueRounds: PoolRound[]; playoffRounds: PoolRound[] } {
  const leagueRoundIds = new Set(rounds.filter((r) => r.stage !== 'playoff').map((r) => r.id));
  return {
    leagueFixtures: fixtures.filter((f) => leagueRoundIds.has(f.round_id)),
    playoffFixtures: fixtures.filter((f) => !leagueRoundIds.has(f.round_id)),
    leagueRounds: rounds.filter((r) => r.stage !== 'playoff'),
    playoffRounds: rounds.filter((r) => r.stage === 'playoff'),
  };
}

/** True once every fixture in a round has a result recorded. */
export function isRoundComplete(round: PoolRound, fixtures: PoolFixture[]): boolean {
  const roundFixtures = fixtures.filter((f) => f.round_id === round.id);
  return roundFixtures.length > 0 && roundFixtures.every((f) => f.completed);
}

/**
 * Fixed top-8 seeded Quarter-Final pairing, matching the darts Championship
 * structure: 1v8, 2v7, 3v6, 4v5. `rankedPlayerIds` must already be sorted
 * best-to-worst (e.g. from calculatePoolStandings). Each pair carries a
 * stable slot_code (QF1..QF4) so the Semi-Final/Final can be built with the
 * correct bracket structure later, rather than random re-pairing.
 */
export function seedTopEightQuarterFinals(
  rankedPlayerIds: string[]
): { slotCode: string; player1: string; player2: string }[] {
  const top8 = rankedPlayerIds.slice(0, 8);
  if (top8.length < 8) return [];
  return [
    { slotCode: 'QF1', player1: top8[0], player2: top8[7] },
    { slotCode: 'QF2', player1: top8[1], player2: top8[6] },
    { slotCode: 'QF3', player1: top8[2], player2: top8[5] },
    { slotCode: 'QF4', player1: top8[3], player2: top8[4] },
  ];
}

/**
 * Given the completed Quarter-Final fixtures (with their slot_code), builds
 * the Semi-Final pairing per the fixed bracket structure: winner of QF1 vs
 * winner of QF4, winner of QF2 vs winner of QF3 — so the top 2 seeds can
 * only meet in the Final, same as the darts Championship bracket.
 */
export function buildSemiFinalPairing(
  quarterFinalFixtures: PoolFixture[]
): { slotCode: string; player1: string; player2: string }[] | null {
  const winnerFor = (slotCode: string): string | null => {
    const f = quarterFinalFixtures.find((x) => x.slot_code === slotCode);
    return f ? fixtureWinnerId(f) : null;
  };
  const w1 = winnerFor('QF1');
  const w2 = winnerFor('QF2');
  const w3 = winnerFor('QF3');
  const w4 = winnerFor('QF4');
  if (!w1 || !w2 || !w3 || !w4) return null;
  return [
    { slotCode: 'SF1', player1: w1, player2: w4 },
    { slotCode: 'SF2', player1: w2, player2: w3 },
  ];
}

/** Builds the Final from the completed Semi-Final fixtures. */
export function buildFinalPairing(
  semiFinalFixtures: PoolFixture[]
): { slotCode: string; player1: string; player2: string } | null {
  const winnerFor = (slotCode: string): string | null => {
    const f = semiFinalFixtures.find((x) => x.slot_code === slotCode);
    return f ? fixtureWinnerId(f) : null;
  };
  const w1 = winnerFor('SF1');
  const w2 = winnerFor('SF2');
  if (!w1 || !w2) return null;
  return { slotCode: 'F', player1: w1, player2: w2 };
}
