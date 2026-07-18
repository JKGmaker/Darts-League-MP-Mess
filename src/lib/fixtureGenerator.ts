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
