import { DayTournamentFixture } from '@/types';

/**
 * Helpers for the one-day tournament module. Two concerns live here that
 * the regular Pool/Darts fixture generator doesn't need to worry about:
 *
 *  1. A "pot-safe" Round 1 draw for singles events — when the admin splits
 *     entrants into pots (e.g. to keep clubmates or top players apart),
 *     Round 1 pairings should avoid putting two people from the same pot
 *     against each other wherever that's mathematically possible.
 *  2. Auto-pairing doubles partners from pots — one entrant from Pot 1 with
 *     one from Pot 2, so teams come out balanced rather than random.
 *
 * Later knockout rounds (Round 2 onward) don't re-apply the pot constraint
 * — that's standard practice, pots are a Round 1 seeding safeguard only —
 * so those just reuse generateKnockoutPairings from fixtureGenerator.ts.
 */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface PotSafeDrawResult {
  pairs: [string, string][];
  byeId: string | null;
  /** Number of pairs that had to be drawn from the same pot because there
   * was no other option left (e.g. one pot has more than half the field). */
  clashes: number;
}

function attemptPairing(
  ids: string[],
  potOf: Map<string, number>
): { pairs: [string, string][]; byeId: string | null; clashes: number } {
  const remaining = [...ids];
  let byeId: string | null = null;
  if (remaining.length % 2 !== 0) {
    const idx = Math.floor(Math.random() * remaining.length);
    byeId = remaining.splice(idx, 1)[0];
  }

  const pairs: [string, string][] = [];
  let clashes = 0;
  while (remaining.length > 0) {
    const a = remaining.shift() as string;
    let idx = remaining.findIndex((id) => potOf.get(id) !== potOf.get(a));
    if (idx === -1) {
      // Everyone left is from the same pot as `a` — an unavoidable clash.
      idx = 0;
      clashes += 1;
    }
    const b = remaining.splice(idx, 1)[0];
    pairs.push([a, b]);
  }
  return { pairs, byeId, clashes };
}

/**
 * Draws Round 1 pairings for a singles knockout, trying hard to avoid
 * pairing two entrants from the same pot together. Only meaningful when the
 * tournament actually has more than one pot in use — call this only when
 * pot_mode is 'multiple'; for a single-pot event use
 * generateKnockoutPairings from fixtureGenerator.ts instead, since with
 * everyone in one pot every pairing would otherwise register as a "clash".
 */
export function generatePotSafeKnockoutPairings(
  entrants: { id: string; potNumber: number }[]
): PotSafeDrawResult {
  const potOf = new Map(entrants.map((e) => [e.id, e.potNumber]));
  const ids = entrants.map((e) => e.id);
  if (ids.length < 2) return { pairs: [], byeId: ids[0] ?? null, clashes: 0 };

  let best: { pairs: [string, string][]; byeId: string | null; clashes: number } | null = null;
  const attempts = 300;
  for (let i = 0; i < attempts; i++) {
    const result = attemptPairing(shuffle(ids), potOf);
    if (!best || result.clashes < best.clashes) best = result;
    if (best.clashes === 0) break;
  }
  return best as PotSafeDrawResult;
}

export interface DoublesPairingResult {
  /** Each team as [entrantId, entrantId]. */
  teams: [string, string][];
  /** Left over with nobody to pair with (odd numbers) — needs a manual call. */
  unpaired: string[];
}

/**
 * Auto-pairs doubles partners: one entrant from Pot 1 with one from Pot 2,
 * shuffled within each pot so who ends up with whom is random but balanced.
 * Any entrants left over once one pot runs out (uneven pot sizes, entrants
 * outside pots 1/2, or a single-pot event where everyone is in Pot 1) are
 * paired off amongst themselves at random. An odd one out is returned in
 * `unpaired` for the admin to sort out manually.
 */
export function pairDoublesFromPots(
  entrants: { id: string; potNumber: number }[]
): DoublesPairingResult {
  const pot1 = shuffle(entrants.filter((e) => e.potNumber === 1).map((e) => e.id));
  const pot2 = shuffle(entrants.filter((e) => e.potNumber === 2).map((e) => e.id));
  const others = shuffle(entrants.filter((e) => e.potNumber !== 1 && e.potNumber !== 2).map((e) => e.id));

  const teams: [string, string][] = [];
  const crossCount = Math.min(pot1.length, pot2.length);
  for (let i = 0; i < crossCount; i++) {
    teams.push([pot1[i], pot2[i]]);
  }

  const leftover = shuffle([...pot1.slice(crossCount), ...pot2.slice(crossCount), ...others]);
  let i = 0;
  for (; i + 1 < leftover.length; i += 2) {
    teams.push([leftover[i], leftover[i + 1]]);
  }
  const unpaired = i < leftover.length ? [leftover[i]] : [];

  return { teams, unpaired };
}

/** "Round of 16" / "Quarter-Final" / "Semi-Final" / "Final" label for a
 * round with this many competitors going into it. */
export function roundNameForSize(numCompetitors: number): string {
  if (numCompetitors <= 2) return 'Final';
  if (numCompetitors <= 4) return 'Semi-Final';
  if (numCompetitors <= 8) return 'Quarter-Final';
  return `Round of ${numCompetitors}`;
}

/** Returns the winning competitor id for a completed, non-bye fixture. */
export function dayFixtureWinnerId(f: DayTournamentFixture): string | null {
  if (f.is_bye) return f.competitor_1_id;
  if (!f.completed || !f.competitor_2_id) return null;
  return f.competitor_1_legs > f.competitor_2_legs ? f.competitor_1_id : f.competitor_2_id;
}
