/**
 * Shared fixture-generation engine used by both the Darts admin and the Pool
 * admin. Generates random pairings while guaranteeing no player faces the
 * same opponent twice, using the standard "circle method" round-robin
 * algorithm. The initial player order is shuffled first, so which specific
 * pairings come up (and in what order) is randomised each time you generate,
 * while the underlying math still guarantees zero repeat match-ups across
 * the rounds produced.
 */

export type Pairing = [string, string];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface GeneratedRound {
  pairs: Pairing[];
  /** The player sitting out this round due to an odd headcount, if any. */
  byePlayerId: string | null;
}

/**
 * Generates `gamesPerPlayer` rounds of random pairings for the given list of
 * player ids. No pairing repeats across the rounds returned. If
 * `gamesPerPlayer` is greater than the maximum possible (n-1 for n players),
 * it's capped at the max — after that point every player has already faced
 * everyone else.
 * If there's an odd number of players, one player sits out (a "bye") each
 * round — `byePlayerId` tells you who, so the caller can decide how to treat
 * that (rest week, walkover win, etc).
 */
export function generateRoundRobinRounds(
  playerIds: string[],
  gamesPerPlayer: number
): GeneratedRound[] {
  const ids = shuffle(playerIds);
  const n = ids.length;
  if (n < 2 || gamesPerPlayer < 1) return [];

  const hasBye = n % 2 !== 0;
  const arr = hasBye ? [...ids, 'BYE'] : [...ids];
  const size = arr.length;
  const maxRounds = size - 1;
  const roundsNeeded = Math.min(gamesPerPlayer, maxRounds);

  const allRounds: GeneratedRound[] = [];
  const working = [...arr];

  for (let r = 0; r < roundsNeeded; r++) {
    const pairs: Pairing[] = [];
    let byePlayerId: string | null = null;
    for (let i = 0; i < size / 2; i++) {
      const a = working[i];
      const b = working[size - 1 - i];
      if (a === 'BYE') byePlayerId = b;
      else if (b === 'BYE') byePlayerId = a;
      else pairs.push([a, b]);
    }
    allRounds.push({ pairs, byePlayerId });

    // Rotate everyone except the first fixed player.
    const fixed = working[0];
    const rest = working.slice(1);
    rest.unshift(rest.pop() as string);
    working.splice(0, working.length, fixed, ...rest);
  }

  return allRounds;
}

/**
 * Generates a single round of random knockout pairings. If there's an odd
 * number of players, one is chosen at random for a bye (auto-advances,
 * no fixture created for them).
 */
export function generateKnockoutPairings(playerIds: string[]): {
  pairs: Pairing[];
  byePlayerId: string | null;
} {
  const shuffled = shuffle(playerIds);
  let byePlayerId: string | null = null;
  if (shuffled.length % 2 !== 0) {
    byePlayerId = shuffled.pop() as string;
  }
  const pairs: Pairing[] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    pairs.push([shuffled[i], shuffled[i + 1]]);
  }
  return { pairs, byePlayerId };
}

// ---------------------------------------------------------------------------
// Pot-aware variants — used by the One-Day Tournament module. When entrants
// are split into pots (e.g. to keep clubmates, or stronger/weaker players,
// apart), the draw should avoid pairing two competitors from the same pot
// wherever it's mathematically possible. Rather than a full constraint
// solver, we take several random shuffles and keep whichever one produces
// the fewest same-pot pairings — simple, fast, and good enough for the
// handful of entrants a one-day event has.
// ---------------------------------------------------------------------------

const POT_AWARE_ATTEMPTS = 60;

function countSamePotPairs(pairs: Pairing[], potOf: Map<string, string | null>): number {
  let clashes = 0;
  for (const [a, b] of pairs) {
    const potA = potOf.get(a) ?? null;
    const potB = potOf.get(b) ?? null;
    if (potA !== null && potB !== null && potA === potB) clashes += 1;
  }
  return clashes;
}

/**
 * Same as generateKnockoutPairings, but tries multiple random draws and
 * keeps the one with the fewest same-pot first-round pairings (0 if
 * achievable). Later knockout rounds are winners-only, so pot avoidance
 * only ever applies to the initial draw.
 */
export function generatePotAwareKnockoutPairings(
  playerIds: string[],
  potOf: Map<string, string | null>
): { pairs: Pairing[]; byePlayerId: string | null } {
  let best: { pairs: Pairing[]; byePlayerId: string | null } | null = null;
  let bestClashes = Infinity;
  for (let i = 0; i < POT_AWARE_ATTEMPTS; i++) {
    const attempt = generateKnockoutPairings(playerIds);
    const clashes = countSamePotPairs(attempt.pairs, potOf);
    if (clashes < bestClashes) {
      best = attempt;
      bestClashes = clashes;
      if (clashes === 0) break;
    }
  }
  return best as { pairs: Pairing[]; byePlayerId: string | null };
}

/**
 * Same as generateRoundRobinRounds, but tries multiple starting shuffles and
 * keeps whichever produces the fewest same-pot pairings summed across every
 * round generated — the round-robin "no repeat opponent" guarantee still
 * holds either way, since it's the same underlying algorithm.
 */
export function generatePotAwareRoundRobinRounds(
  playerIds: string[],
  gamesPerPlayer: number,
  potOf: Map<string, string | null>
): GeneratedRound[] {
  let best: GeneratedRound[] | null = null;
  let bestClashes = Infinity;
  for (let i = 0; i < POT_AWARE_ATTEMPTS; i++) {
    const attempt = generateRoundRobinRounds(playerIds, gamesPerPlayer);
    const clashes = attempt.reduce((sum, round) => sum + countSamePotPairs(round.pairs, potOf), 0);
    if (clashes < bestClashes) {
      best = attempt;
      bestClashes = clashes;
      if (clashes === 0) break;
    }
  }
  return best || [];
}

/**
 * Auto-pairs doubles teams from a pot-tagged entrant list. With two (or
 * more) pots, entrants are interleaved round-robin across pots before
 * pairing up adjacent entrants, so partners come from different pots
 * wherever possible (guaranteed when there are exactly two evenly-sized
 * pots). With a single pot, it's just a random draw. Returns the pairs plus
 * the id of anyone left over on an odd headcount (no partner found).
 */
export function pairDoublesFromPots(
  entrants: { id: string; potId: string | null }[]
): { pairs: Pairing[]; unpairedId: string | null } {
  const potGroups = new Map<string, string[]>();
  for (const e of entrants) {
    const key = e.potId || '__none__';
    const list = potGroups.get(key) || [];
    list.push(e.id);
    potGroups.set(key, list);
  }
  const shuffledGroups = Array.from(potGroups.values()).map((ids) => shuffle(ids));

  // Interleave: pot1[0], pot2[0], pot3[0], pot1[1], pot2[1], ...
  const interleaved: string[] = [];
  const maxLen = Math.max(0, ...shuffledGroups.map((g) => g.length));
  for (let i = 0; i < maxLen; i++) {
    for (const group of shuffledGroups) {
      if (group[i]) interleaved.push(group[i]);
    }
  }

  const pairs: Pairing[] = [];
  let unpairedId: string | null = null;
  for (let i = 0; i < interleaved.length; i += 2) {
    if (i + 1 < interleaved.length) pairs.push([interleaved[i], interleaved[i + 1]]);
    else unpairedId = interleaved[i];
  }
  return { pairs, unpairedId };
}
