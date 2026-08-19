import {
  DayTournamentCompetitor,
  DayTournamentFixture,
  DayTournamentPlayer,
  DayTournamentStandingsRow,
} from '@/types';

/** Display name for a competitor — a player's name (singles) or
 * "Player A & Player B" (doubles). */
export function competitorLabel(
  competitor: { player_1_id: string; player_2_id: string | null },
  playerMap: Map<string, DayTournamentPlayer>
): string {
  const p1 = playerMap.get(competitor.player_1_id)?.name || '?';
  if (!competitor.player_2_id) return p1;
  const p2 = playerMap.get(competitor.player_2_id)?.name || '?';
  return `${p1} & ${p2}`;
}

/** Returns the winning competitor's id for a completed, non-bye fixture. */
export function dayFixtureWinnerId(f: DayTournamentFixture): string | null {
  if (f.is_bye) return f.competitor_1_id;
  if (!f.completed || !f.competitor_2_id) return null;
  return f.competitor_1_score > f.competitor_2_score ? f.competitor_1_id : f.competitor_2_id;
}

/** True once every fixture in a round has a result recorded. */
export function isDayRoundComplete(roundId: string, fixtures: DayTournamentFixture[]): boolean {
  const roundFixtures = fixtures.filter((f) => f.round_id === roundId);
  return roundFixtures.length > 0 && roundFixtures.every((f) => f.completed);
}

/**
 * League standings for a one-day tournament, from its competitors and
 * completed fixtures. Scoring: Win = 2 Pts, Loss = 0 Pts. A bye counts as a
 * walkover win for whoever sits out (2 pts, no legs either way).
 * Sort Hierarchy: Points → Leg difference → Head-to-head → fewest
 * walkover-derived points → Alphabetical. Mirrors calculatePoolStandings.
 */
export function calculateDayTournamentStandings(
  competitors: DayTournamentCompetitor[],
  fixtures: DayTournamentFixture[],
  playerMap: Map<string, DayTournamentPlayer>
): DayTournamentStandingsRow[] {
  const stats: Record<string, Omit<DayTournamentStandingsRow, 'position' | 'name'>> = {};
  const walkoverPoints: Record<string, number> = {};

  competitors.forEach((c) => {
    stats[c.id] = {
      competitorId: c.id,
      played: 0,
      won: 0,
      lost: 0,
      legsWon: 0,
      legsLost: 0,
      legDifference: 0,
      points: 0,
    };
    walkoverPoints[c.id] = 0;
  });

  const headToHead: Record<string, Record<string, number>> = {};
  competitors.forEach((c1) => {
    headToHead[c1.id] = {};
    competitors.forEach((c2) => {
      headToHead[c1.id][c2.id] = 0;
    });
  });

  fixtures.forEach((f) => {
    if (!f.completed) return;

    if (f.is_bye) {
      if (!stats[f.competitor_1_id]) return;
      stats[f.competitor_1_id].played += 1;
      stats[f.competitor_1_id].won += 1;
      stats[f.competitor_1_id].points += 2;
      walkoverPoints[f.competitor_1_id] += 2;
      return;
    }

    if (!f.competitor_2_id) return;
    if (!stats[f.competitor_1_id] || !stats[f.competitor_2_id]) return;

    const c1 = f.competitor_1_id;
    const c2 = f.competitor_2_id;
    const s1 = f.competitor_1_score;
    const s2 = f.competitor_2_score;

    stats[c1].played += 1;
    stats[c2].played += 1;
    stats[c1].legsWon += s1;
    stats[c1].legsLost += s2;
    stats[c2].legsWon += s2;
    stats[c2].legsLost += s1;

    if (s1 > s2) {
      stats[c1].won += 1;
      stats[c1].points += 2;
      stats[c2].lost += 1;
      headToHead[c1][c2] += 1;
    } else {
      stats[c2].won += 1;
      stats[c2].points += 2;
      stats[c1].lost += 1;
      headToHead[c2][c1] += 1;
    }
  });

  Object.keys(stats).forEach((id) => {
    stats[id].legDifference = stats[id].legsWon - stats[id].legsLost;
  });

  const standings = competitors.map((c) => ({
    ...stats[c.id],
    name: competitorLabel(c, playerMap),
    position: 0,
  }));

  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.legDifference !== a.legDifference) return b.legDifference - a.legDifference;
    const aVsB = headToHead[a.competitorId]?.[b.competitorId] || 0;
    const bVsA = headToHead[b.competitorId]?.[a.competitorId] || 0;
    if (aVsB !== bVsA) return bVsA - aVsB;
    const aWo = walkoverPoints[a.competitorId] || 0;
    const bWo = walkoverPoints[b.competitorId] || 0;
    if (aWo !== bWo) return aWo - bWo;
    return a.name.localeCompare(b.name);
  });

  return standings.map((row, idx) => ({ ...row, position: idx + 1 }));
}
