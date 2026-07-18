import { Player, Fixture, PlayoffMatchRow, PlayoffSettings, Bracket } from '@/types';
import { calculateStandings } from './utils';

/**
 * A slot in a match is filled by one of:
 *  - a league seed (final standings position, 1-indexed)
 *  - the winner of an earlier match (referenced by its code)
 *  - a bye (no participant)
 */
export type SlotSource =
  | { kind: 'seed'; seed: number }
  | { kind: 'winner'; from: string }
  | { kind: 'bye' };

export interface MatchDef {
  code: string;
  bracket: Bracket;
  round: number;
  roundLabel: string;
  label: string;
  short: string; // short label used inside "Winner X" references
  source1: SlotSource;
  source2: SlotSource;
}

// ---------------------------------------------------------------------------
// CHAMPIONSHIP — seeds 1-8
// QF: 1v8, 2v7, 3v6, 4v5
// SF1 = W(QF1) v W(QF4)   SF2 = W(QF2) v W(QF3)
// Final = W(SF1) v W(SF2)
// ---------------------------------------------------------------------------
const CHAMPIONSHIP: MatchDef[] = [
  { code: 'CH-QF1', bracket: 'championship', round: 1, roundLabel: 'Quarter-Finals', label: 'Quarter-Final 1', short: 'QF1', source1: { kind: 'seed', seed: 1 }, source2: { kind: 'seed', seed: 8 } },
  { code: 'CH-QF2', bracket: 'championship', round: 1, roundLabel: 'Quarter-Finals', label: 'Quarter-Final 2', short: 'QF2', source1: { kind: 'seed', seed: 2 }, source2: { kind: 'seed', seed: 7 } },
  { code: 'CH-QF3', bracket: 'championship', round: 1, roundLabel: 'Quarter-Finals', label: 'Quarter-Final 3', short: 'QF3', source1: { kind: 'seed', seed: 3 }, source2: { kind: 'seed', seed: 6 } },
  { code: 'CH-QF4', bracket: 'championship', round: 1, roundLabel: 'Quarter-Finals', label: 'Quarter-Final 4', short: 'QF4', source1: { kind: 'seed', seed: 4 }, source2: { kind: 'seed', seed: 5 } },
  { code: 'CH-SF1', bracket: 'championship', round: 2, roundLabel: 'Semi-Finals', label: 'Semi-Final 1', short: 'SF1', source1: { kind: 'winner', from: 'CH-QF1' }, source2: { kind: 'winner', from: 'CH-QF4' } },
  { code: 'CH-SF2', bracket: 'championship', round: 2, roundLabel: 'Semi-Finals', label: 'Semi-Final 2', short: 'SF2', source1: { kind: 'winner', from: 'CH-QF2' }, source2: { kind: 'winner', from: 'CH-QF3' } },
  { code: 'CH-F', bracket: 'championship', round: 3, roundLabel: 'Final', label: 'Final', short: 'Final', source1: { kind: 'winner', from: 'CH-SF1' }, source2: { kind: 'winner', from: 'CH-SF2' } },
];

// ---------------------------------------------------------------------------
// SHIELD — seeds 9-17 (9 players)
// Seed 9 receives a bye into the Semi-Final.
// Round 1: 10v17, 11v16, 12v15, 13v14
// Round 2: W(10v17) v W(13v14)  |  W(11v16) v W(12v15)
// Semi-Final: 9 v W(11v16/12v15 line).  W(10v17/13v14 line) byes into the Final.
// Final: W(Semi) v W(10v17/13v14 line)
// ---------------------------------------------------------------------------
const SHIELD: MatchDef[] = [
  { code: 'SH-R1-1', bracket: 'shield', round: 1, roundLabel: 'Round 1', label: 'Round 1 — Match 1', short: 'R1·1', source1: { kind: 'seed', seed: 10 }, source2: { kind: 'seed', seed: 17 } },
  { code: 'SH-R1-2', bracket: 'shield', round: 1, roundLabel: 'Round 1', label: 'Round 1 — Match 2', short: 'R1·2', source1: { kind: 'seed', seed: 11 }, source2: { kind: 'seed', seed: 16 } },
  { code: 'SH-R1-3', bracket: 'shield', round: 1, roundLabel: 'Round 1', label: 'Round 1 — Match 3', short: 'R1·3', source1: { kind: 'seed', seed: 12 }, source2: { kind: 'seed', seed: 15 } },
  { code: 'SH-R1-4', bracket: 'shield', round: 1, roundLabel: 'Round 1', label: 'Round 1 — Match 4', short: 'R1·4', source1: { kind: 'seed', seed: 13 }, source2: { kind: 'seed', seed: 14 } },
  { code: 'SH-R2-1', bracket: 'shield', round: 2, roundLabel: 'Round 2', label: 'Round 2 — Match 1', short: 'R2·1', source1: { kind: 'winner', from: 'SH-R1-1' }, source2: { kind: 'winner', from: 'SH-R1-4' } },
  { code: 'SH-R2-2', bracket: 'shield', round: 2, roundLabel: 'Round 2', label: 'Round 2 — Match 2', short: 'R2·2', source1: { kind: 'winner', from: 'SH-R1-2' }, source2: { kind: 'winner', from: 'SH-R1-3' } },
  { code: 'SH-SF1', bracket: 'shield', round: 3, roundLabel: 'Semi-Final', label: 'Semi-Final', short: 'SF', source1: { kind: 'seed', seed: 9 }, source2: { kind: 'winner', from: 'SH-R2-2' } },
  { code: 'SH-F', bracket: 'shield', round: 4, roundLabel: 'Final', label: 'Final', short: 'Final', source1: { kind: 'winner', from: 'SH-SF1' }, source2: { kind: 'winner', from: 'SH-R2-1' } },
];

export const BRACKET_DEFS: Record<Bracket, MatchDef[]> = {
  championship: CHAMPIONSHIP,
  shield: SHIELD,
};

export const BRACKET_META: Record<Bracket, { title: string; seedRange: string; note: string }> = {
  championship: {
    title: 'Championship',
    seedRange: 'Seeds 1–8',
    note: 'The top eight in the final league standings. Straight knockout — quarter-finals, semi-finals, then the final.',
  },
  shield: {
    title: 'Shield',
    seedRange: 'Seeds 9–17',
    note: 'Seed 9 receives a bye into the Semi-Final. The Round 2 winner from the top line byes straight into the Final.',
  },
};

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------
export interface ResolvedSlot {
  player: Player | null;
  label: string;     // shown when the player is not yet known (e.g. "Seed 3", "Winner QF1")
  seed?: number;
  isBye: boolean;
}

export interface ResolvedMatch {
  def: MatchDef;
  slot1: ResolvedSlot;
  slot2: ResolvedSlot;
  player1Score: number;
  player2Score: number;
  bestOf: number;
  completed: boolean;
  winner: Player | null;
  excluded: boolean;
  row?: PlayoffMatchRow;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Builds the seed → player list.
 * If the playoffs are locked we use the frozen snapshot taken at lock time,
 * otherwise we read live off the current standings so the bracket previews
 * exactly as the table moves.
 */
export function buildSeeds(
  players: Player[],
  fixtures: Fixture[],
  settings: PlayoffSettings | null
): (Player | null)[] {
  const byId = new Map(players.map((p) => [p.id, p]));
  if (settings?.playoffs_locked && settings.seed_snapshot && settings.seed_snapshot.length) {
    return settings.seed_snapshot.map((id) => byId.get(id) || null);
  }
  const standings = calculateStandings(players, fixtures);
  return standings.map((s) => byId.get(s.playerId) || null);
}

export function resolveBracket(
  bracket: Bracket,
  players: Player[],
  fixtures: Fixture[],
  settings: PlayoffSettings | null,
  rows: PlayoffMatchRow[]
): ResolvedMatch[] {
  const defs = BRACKET_DEFS[bracket];
  const defByCode = new Map(defs.map((d) => [d.code, d]));
  const seeds = buildSeeds(players, fixtures, settings);
  const byId = new Map(players.map((p) => [p.id, p]));
  const rowByCode = new Map(rows.filter((r) => r.bracket === bracket).map((r) => [r.code, r]));
  const defaultBestOf = settings?.default_best_of ?? 5;

  const cache = new Map<string, ResolvedMatch>();

  const resolveSlot = (source: SlotSource, overrideId: string | null): ResolvedSlot => {
    if (overrideId) {
      const p = byId.get(overrideId) || null;
      return { player: p, label: p?.name || 'TBD', isBye: false };
    }
    if (source.kind === 'bye') {
      return { player: null, label: 'Bye', isBye: true };
    }
    if (source.kind === 'seed') {
      const p = seeds[source.seed - 1] || null;
      return { player: p, label: p?.name || `${ordinal(source.seed)} seed`, seed: source.seed, isBye: false };
    }
    // winner of another match
    const feeder = resolveMatch(source.from);
    if (feeder.excluded) {
      // The feeder match has been removed from the bracket (e.g. not enough
      // players this season) — nothing flows forward from it automatically.
      // An admin can still manually override this slot to whoever should be
      // here instead.
      return { player: null, label: 'Bye', isBye: true };
    }
    const fromDef = defByCode.get(source.from);
    return {
      player: feeder?.winner || null,
      label: feeder?.winner?.name || `Winner ${fromDef?.short ?? source.from}`,
      isBye: false,
    };
  };

  function resolveMatch(code: string): ResolvedMatch {
    const cached = cache.get(code);
    if (cached) return cached;

    const def = defByCode.get(code)!;
    const row = rowByCode.get(code);

    // placeholder first to guard against (non-existent) cycles
    const placeholder: ResolvedMatch = {
      def,
      slot1: { player: null, label: 'TBD', isBye: false },
      slot2: { player: null, label: 'TBD', isBye: false },
      player1Score: row?.player_1_score ?? 0,
      player2Score: row?.player_2_score ?? 0,
      bestOf: row?.best_of ?? defaultBestOf,
      completed: row?.completed ?? false,
      winner: null,
      excluded: row?.excluded ?? false,
      row,
    };
    cache.set(code, placeholder);

    const slot1 = resolveSlot(def.source1, row?.override_player_1_id ?? null);
    const slot2 = resolveSlot(def.source2, row?.override_player_2_id ?? null);

    let winner: Player | null = null;
    if (row?.override_winner_id) {
      winner = byId.get(row.override_winner_id) || null;
    } else if (row?.completed && slot1.player && slot2.player && row.player_1_score !== row.player_2_score) {
      winner = row.player_1_score > row.player_2_score ? slot1.player : slot2.player;
    }

    const resolved: ResolvedMatch = { ...placeholder, slot1, slot2, winner };
    cache.set(code, resolved);
    return resolved;
  }

  return defs.map((d) => resolveMatch(d.code));
}

/** Champion / Shield winner (winner of the Final), or null if not decided. */
export function bracketChampion(resolved: ResolvedMatch[]): Player | null {
  const final = resolved.find((m) => m.def.round === Math.max(...resolved.map((x) => x.def.round)));
  return final?.winner ?? null;
}
