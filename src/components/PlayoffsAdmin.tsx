'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Player, Week, Fixture, PlayoffSettings, PlayoffMatchRow, Bracket } from '@/types';
import { supabase } from '@/lib/supabase';
import { calculateStandings } from '@/lib/utils';
import { resolveBracket, BRACKET_DEFS, BRACKET_META, ResolvedMatch } from '@/lib/playoffs';

interface PlayoffsAdminProps {
  initialPlayers: Player[];
  initialWeeks: Week[];
  initialFixtures: Fixture[];
}

interface Draft {
  best_of: string;
  p1: string;
  p2: string;
  ovP1: string;
  ovP2: string;
  ovWinner: string;
  completed: boolean;
  excluded: boolean;
}

export default function PlayoffsAdmin({ initialPlayers, initialWeeks, initialFixtures }: PlayoffsAdminProps) {
  const [players] = useState<Player[]>(initialPlayers);
  const [weeks] = useState<Week[]>(initialWeeks);
  const [fixtures] = useState<Fixture[]>(initialFixtures);

  const [settings, setSettings] = useState<PlayoffSettings | null>(null);
  const [rows, setRows] = useState<PlayoffMatchRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [defaultBoInput, setDefaultBoInput] = useState('5');

  const standings = useMemo(() => calculateStandings(players, fixtures), [players, fixtures]);
  const defaultBestOf = settings?.default_best_of ?? 5;

  const blankDraft = (bo: number): Draft => ({
    best_of: String(bo), p1: '0', p2: '0', ovP1: '', ovP2: '', ovWinner: '', completed: false, excluded: false,
  });

  const draftFromRow = (r: PlayoffMatchRow | undefined, bo: number): Draft => ({
    best_of: String(r?.best_of ?? bo),
    p1: r ? String(r.player_1_score) : '0',
    p2: r ? String(r.player_2_score) : '0',
    ovP1: r?.override_player_1_id ?? '',
    ovP2: r?.override_player_2_id ?? '',
    ovWinner: r?.override_winner_id ?? '',
    completed: r?.completed ?? false,
    excluded: r?.excluded ?? false,
  });

  const buildAllDrafts = (rs: PlayoffMatchRow[], bo: number) => {
    const rowByCode = new Map(rs.map((r) => [`${r.bracket}:${r.code}`, r]));
    const next: Record<string, Draft> = {};
    (['championship', 'shield'] as Bracket[]).forEach((b) => {
      BRACKET_DEFS[b].forEach((d) => {
        next[`${b}:${d.code}`] = draftFromRow(rowByCode.get(`${b}:${d.code}`), bo);
      });
    });
    return next;
  };

  // ---- load ----------------------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const [{ data: s }, { data: m }] = await Promise.all([
          supabase.from('playoff_settings').select('*').eq('id', 1).maybeSingle(),
          supabase.from('playoff_matches').select('*'),
        ]);
        const st = (s as PlayoffSettings) || null;
        const ms = (m as PlayoffMatchRow[]) || [];
        setSettings(st);
        setRows(ms);
        setDefaultBoInput(String(st?.default_best_of ?? 5));
        setDrafts(buildAllDrafts(ms, st?.default_best_of ?? 5));
      } catch {
        setSettings(null);
        setRows([]);
        setDrafts(buildAllDrafts([], 5));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setDraft = (key: string, field: keyof Draft, value: string | boolean) => {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  // ---- Week 10 generator ---------------------------------------------------
  const generateWeek10 = async () => {
    if (standings.length < 2) {
      alert('Not enough players in the standings to generate fixtures.');
      return;
    }
    setBusy(true);
    try {
      let week = weeks.find((w) => w.name.trim().toLowerCase() === 'week 10');
      if (!week) {
        const order = weeks.reduce((m, w) => Math.max(m, w.sequence_order), 0) + 1;
        const { data, error } = await supabase
          .from('weeks')
          .insert([{ name: 'Week 10', sequence_order: order }])
          .select()
          .single();
        if (error) { alert(error.message); setBusy(false); return; }
        week = data as Week;
      }

      const { data: existing } = await supabase.from('fixtures').select('id').eq('week_id', week.id);
      if (existing && existing.length) {
        if (!confirm(`Week 10 already has ${existing.length} fixture(s). Replace them with freshly seeded pairings (1v2, 3v4 …)?`)) {
          setBusy(false);
          return;
        }
        await supabase.from('fixtures').delete().eq('week_id', week.id);
      }

      const inserts = [];
      for (let i = 0; i + 1 < standings.length; i += 2) {
        inserts.push({
          week_id: week.id,
          player_1_id: standings[i].playerId,
          player_2_id: standings[i + 1].playerId,
          completed: false,
          best_of: defaultBestOf,
        });
      }
      const { error } = await supabase.from('fixtures').insert(inserts);
      if (error) { alert(error.message); setBusy(false); return; }
      alert(`Generated ${inserts.length} Week 10 fixtures from the standings. Reloading…`);
      window.location.reload();
    } catch (e) {
      alert('Something went wrong generating Week 10. Have you run the playoffs SQL migration?');
      setBusy(false);
    }
  };

  // ---- lock / unlock / settings -------------------------------------------
  const upsertSettings = async (patch: Partial<PlayoffSettings>) => {
    const payload = {
      id: 1,
      playoffs_locked: patch.playoffs_locked ?? settings?.playoffs_locked ?? false,
      seed_snapshot: patch.seed_snapshot ?? settings?.seed_snapshot ?? null,
      default_best_of: patch.default_best_of ?? settings?.default_best_of ?? 5,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('playoff_settings')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();
    if (error) { alert(error.message); return; }
    setSettings(data as PlayoffSettings);
  };

  const lockPlayoffs = async () => {
    if (!confirm('Lock the final standings into the play-off seeds? Brackets will stop following the live table.')) return;
    setBusy(true);
    await upsertSettings({ playoffs_locked: true, seed_snapshot: standings.map((s) => s.playerId) });
    setBusy(false);
  };

  const unlockPlayoffs = async () => {
    if (!confirm('Unlock the seeds? Brackets will follow the live league table again.')) return;
    setBusy(true);
    await upsertSettings({ playoffs_locked: false });
    setBusy(false);
  };

  const reSnapshot = async () => {
    if (!confirm('Re-take the seed snapshot from the current standings?')) return;
    setBusy(true);
    await upsertSettings({ playoffs_locked: true, seed_snapshot: standings.map((s) => s.playerId) });
    setBusy(false);
  };

  const saveDefaultBo = async () => {
    const v = parseInt(defaultBoInput, 10);
    const bo = isNaN(v) || v < 1 ? 5 : v;
    await upsertSettings({ default_best_of: bo });
    // refresh best-of on matches that have no saved row yet
    setDrafts((prev) => {
      const next = { ...prev };
      const hasRow = new Set(rows.map((r) => `${r.bracket}:${r.code}`));
      Object.keys(next).forEach((k) => {
        if (!hasRow.has(k)) next[k] = { ...next[k], best_of: String(bo) };
      });
      return next;
    });
  };

  // ---- per-match save / clear ---------------------------------------------
  const applyRow = (saved: PlayoffMatchRow) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.bracket === saved.bracket && r.code === saved.code);
      if (idx === -1) return [...prev, saved];
      const copy = [...prev];
      copy[idx] = saved;
      return copy;
    });
  };

  const saveMatch = async (bracket: Bracket, code: string) => {
    const key = `${bracket}:${code}`;
    const d = drafts[key];
    if (!d) return;
    const payload = {
      bracket,
      code,
      best_of: parseInt(d.best_of, 10) || defaultBestOf,
      player_1_score: parseInt(d.p1, 10) || 0,
      player_2_score: parseInt(d.p2, 10) || 0,
      completed: d.completed,
      override_player_1_id: d.ovP1 || null,
      override_player_2_id: d.ovP2 || null,
      override_winner_id: d.ovWinner || null,
      excluded: d.excluded,
    };
    const { data, error } = await supabase
      .from('playoff_matches')
      .upsert(payload, { onConflict: 'bracket,code' })
      .select()
      .single();
    if (error) { alert(error.message); return; }
    const saved = data as PlayoffMatchRow;
    applyRow(saved);
    setDrafts((prev) => ({ ...prev, [key]: draftFromRow(saved, defaultBestOf) }));
  };

  /** Instantly excludes/restores a match without needing a separate Save click. */
  const setExcluded = async (bracket: Bracket, code: string, excluded: boolean) => {
    const key = `${bracket}:${code}`;
    const d = drafts[key] || blankDraft(defaultBestOf);
    const payload = {
      bracket,
      code,
      best_of: parseInt(d.best_of, 10) || defaultBestOf,
      player_1_score: parseInt(d.p1, 10) || 0,
      player_2_score: parseInt(d.p2, 10) || 0,
      completed: d.completed,
      override_player_1_id: d.ovP1 || null,
      override_player_2_id: d.ovP2 || null,
      override_winner_id: d.ovWinner || null,
      excluded,
    };
    const { data, error } = await supabase
      .from('playoff_matches')
      .upsert(payload, { onConflict: 'bracket,code' })
      .select()
      .single();
    if (error) { alert(error.message); return; }
    const saved = data as PlayoffMatchRow;
    applyRow(saved);
    setDrafts((prev) => ({ ...prev, [key]: draftFromRow(saved, defaultBestOf) }));
  };

  const clearMatch = async (bracket: Bracket, code: string) => {
    if (!confirm('Clear this match result and overrides?')) return;
    const key = `${bracket}:${code}`;
    const existing = rows.find((r) => r.bracket === bracket && r.code === code);
    if (existing) {
      const { error } = await supabase.from('playoff_matches').delete().eq('id', existing.id);
      if (error) { alert(error.message); return; }
      setRows((prev) => prev.filter((r) => r.id !== existing.id));
    }
    setDrafts((prev) => ({ ...prev, [key]: blankDraft(defaultBestOf) }));
  };

  const resetBracket = async (bracket: Bracket) => {
    if (!confirm(`Reset the entire ${BRACKET_META[bracket].title} bracket? This clears every score and override for it.`)) return;
    const { error } = await supabase.from('playoff_matches').delete().eq('bracket', bracket);
    if (error) { alert(error.message); return; }
    setRows((prev) => prev.filter((r) => r.bracket !== bracket));
    setDrafts((prev) => {
      const next = { ...prev };
      BRACKET_DEFS[bracket].forEach((d) => { next[`${bracket}:${d.code}`] = blankDraft(defaultBestOf); });
      return next;
    });
  };

  const playerName = (id: string | null | undefined) => players.find((p) => p.id === id)?.name || '';

  // resolved brackets for live preview (mirrors the public pages)
  const resolvedByBracket = useMemo(() => {
    return {
      championship: resolveBracket('championship', players, fixtures, settings, rows),
      shield: resolveBracket('shield', players, fixtures, settings, rows),
    };
  }, [players, fixtures, settings, rows]);

  if (loading) {
    return (
      <div className="bg-charcoal-900 border border-emerald-950 p-5 rounded-xl">
        <p className="text-emerald-400 text-sm animate-pulse">Loading play-offs…</p>
      </div>
    );
  }

  const locked = !!settings?.playoffs_locked;

  const renderMatch = (bracket: Bracket, m: ResolvedMatch) => {
    const key = `${bracket}:${m.def.code}`;
    const d = drafts[key];
    if (!d) return null;
    return (
      <div key={m.def.code} className={`bg-charcoal-950 border rounded-lg p-3 space-y-2 ${d.excluded ? 'border-rose-900/50 opacity-60' : 'border-emerald-900/30'}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">{m.def.label}</span>
          <div className="flex items-center gap-1">
            <label className="text-[10px] text-gray-500">Best of</label>
            <input
              type="number" min="1" value={d.best_of}
              onChange={(e) => setDraft(key, 'best_of', e.target.value)}
              className="w-12 bg-charcoal-900 border border-amber-700/60 rounded px-1.5 py-0.5 text-xs text-white text-center focus:outline-none"
            />
          </div>
        </div>

        {d.excluded && (
          <div className="flex items-center justify-between gap-2 bg-rose-950/30 border border-rose-900/40 rounded-lg px-3 py-2">
            <span className="text-[11px] font-bold text-rose-400">Not used this season — hidden from the public bracket</span>
            <button onClick={() => setExcluded(bracket, m.def.code, false)}
              className="shrink-0 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-900/30 hover:bg-emerald-900/50 px-2.5 py-1 rounded transition-colors">
              Restore
            </button>
          </div>
        )}

        {/* current resolved participants */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-charcoal-900 rounded px-2 py-1 truncate text-gray-300">
            <span className="text-gray-500">P1:</span> {m.slot1.label}
          </div>
          <div className="bg-charcoal-900 rounded px-2 py-1 truncate text-gray-300">
            <span className="text-gray-500">P2:</span> {m.slot2.label}
          </div>
        </div>

        {/* scores */}
        <div className="flex items-center gap-2">
          <input
            type="number" min="0" value={d.p1} onChange={(e) => setDraft(key, 'p1', e.target.value)}
            className="w-14 bg-charcoal-900 border border-emerald-700 rounded px-2 py-1 text-sm text-white text-center focus:outline-none" placeholder="P1"
          />
          <span className="text-gray-500 text-xs">-</span>
          <input
            type="number" min="0" value={d.p2} onChange={(e) => setDraft(key, 'p2', e.target.value)}
            className="w-14 bg-charcoal-900 border border-emerald-700 rounded px-2 py-1 text-sm text-white text-center focus:outline-none" placeholder="P2"
          />
          <label className="flex items-center gap-1 text-[11px] text-gray-400 ml-1 cursor-pointer">
            <input type="checkbox" checked={d.completed} onChange={(e) => setDraft(key, 'completed', e.target.checked)} />
            Played
          </label>
          {m.winner && <span className="ml-auto text-[11px] font-bold text-amber-400 truncate max-w-[120px]">→ {m.winner.name}</span>}
        </div>

        {/* overrides (collapsible-lite) */}
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-300 select-none">Manual overrides</summary>
          <div className="mt-2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <select value={d.ovP1} onChange={(e) => setDraft(key, 'ovP1', e.target.value)}
                className="bg-charcoal-900 border border-emerald-900/50 rounded px-2 py-1 text-xs text-white focus:outline-none">
                <option value="">P1: auto</option>
                {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={d.ovP2} onChange={(e) => setDraft(key, 'ovP2', e.target.value)}
                className="bg-charcoal-900 border border-emerald-900/50 rounded px-2 py-1 text-xs text-white focus:outline-none">
                <option value="">P2: auto</option>
                {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <select value={d.ovWinner} onChange={(e) => setDraft(key, 'ovWinner', e.target.value)}
              className="w-full bg-charcoal-900 border border-amber-900/50 rounded px-2 py-1 text-xs text-white focus:outline-none">
              <option value="">Winner: auto (higher score)</option>
              {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </details>

        <div className="flex gap-2">
          <button onClick={() => saveMatch(bracket, m.def.code)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-1.5 rounded transition-colors">Save</button>
          <button onClick={() => clearMatch(bracket, m.def.code)}
            className="px-3 bg-rose-900/40 text-rose-400 hover:bg-rose-900/60 text-xs font-bold py-1.5 rounded transition-colors">Clear</button>
          {!d.excluded && (
            <button onClick={() => setExcluded(bracket, m.def.code, true)}
              className="px-3 bg-charcoal-800 text-gray-400 hover:bg-charcoal-700 hover:text-gray-200 text-xs font-bold py-1.5 rounded transition-colors">
              Remove
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderBracket = (bracket: Bracket) => {
    const meta = BRACKET_META[bracket];
    const resolved = resolvedByBracket[bracket];
    const rounds = Array.from(new Set(resolved.map((m) => m.def.round))).sort((a, b) => a - b);
    return (
      <div className="bg-charcoal-900 border border-emerald-950 p-5 rounded-xl space-y-4">
        <div className="flex items-center justify-between border-b border-charcoal-800 pb-2">
          <div>
            <h3 className="text-lg font-bold text-white">{bracket === 'championship' ? '🏆' : '🛡️'} {meta.title}</h3>
            <p className="text-xs text-gray-500">{meta.seedRange}</p>
          </div>
          <button onClick={() => resetBracket(bracket)}
            className="text-xs font-bold text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded bg-rose-900/30 hover:bg-rose-900/50 transition-colors">
            Reset bracket
          </button>
        </div>
        {rounds.map((r) => {
          const rm = resolved.filter((m) => m.def.round === r);
          return (
            <div key={r} className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400">{rm[0]?.def.roundLabel}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {rm.map((m) => renderMatch(bracket, m))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center gap-2">
        <span className="w-2 h-6 bg-amber-500 rounded-sm inline-block" />
        <h2 className="text-xl font-black tracking-tight text-white">Play-offs & Week 10</h2>
      </div>

      {/* Week 10 + seed control */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-charcoal-900 border border-emerald-950 p-5 rounded-xl space-y-3">
          <h3 className="text-base font-bold text-white">Week 10 Fixtures</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Generates the Week 10 round straight from the current standings — 1v2, 3v4, 5v6 … down the table.
            Creates a “Week 10” stage if it doesn’t exist. Pairings stay fully editable afterwards in Fixtures Management.
          </p>
          <button onClick={generateWeek10} disabled={busy}
            className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-sm py-2.5 rounded-lg transition-colors">
            Generate Week 10 from standings
          </button>
        </div>

        <div className="bg-charcoal-900 border border-emerald-950 p-5 rounded-xl space-y-3">
          <h3 className="text-base font-bold text-white">Seed Lock</h3>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${locked ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-900/40 text-emerald-300'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${locked ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
              {locked ? 'Seeds locked' : 'Following live table'}
            </span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Before locking, brackets preview live from the table. After Week 10, lock to freeze the final seeds.
          </p>
          {!locked ? (
            <button onClick={lockPlayoffs} disabled={busy}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm py-2.5 rounded-lg transition-colors">
              Lock final seeds
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={reSnapshot} disabled={busy}
                className="flex-1 bg-amber-700/60 hover:bg-amber-700 text-white font-bold text-xs py-2 rounded-lg transition-colors">
                Re-snapshot
              </button>
              <button onClick={unlockPlayoffs} disabled={busy}
                className="flex-1 bg-charcoal-800 hover:bg-charcoal-700 text-gray-300 font-bold text-xs py-2 rounded-lg transition-colors">
                Unlock
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <label className="text-xs text-gray-400">Default best of</label>
            <input type="number" min="1" value={defaultBoInput} onChange={(e) => setDefaultBoInput(e.target.value)}
              className="w-14 bg-charcoal-950 border border-amber-700/60 rounded px-2 py-1 text-xs text-white text-center focus:outline-none" />
            <button onClick={saveDefaultBo}
              className="text-xs font-bold bg-charcoal-800 hover:bg-charcoal-700 text-gray-200 px-3 py-1 rounded transition-colors">Save</button>
          </div>
        </div>
      </div>

      {/* locked seed preview */}
      <div className="bg-charcoal-900 border border-emerald-950 p-4 rounded-xl">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-2">
          Current seeding {locked ? '(locked)' : '(live)'}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {standings.slice(0, 18).map((s) => (
            <span key={s.playerId} className="text-[11px] bg-charcoal-950 border border-emerald-900/30 rounded px-2 py-1 text-gray-300">
              <span className="text-emerald-400 font-bold">{s.position}.</span> {s.name}
              {s.position >= 1 && s.position <= 8 && <span className="ml-1 text-amber-400">🏆</span>}
              {s.position >= 9 && s.position <= 17 && <span className="ml-1 text-emerald-400">🛡️</span>}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-gray-500 mt-2">🏆 Championship (1–8) · 🛡️ Shield (9–17) · 18th and below do not enter the play-offs.</p>
      </div>

      {renderBracket('championship')}
      {renderBracket('shield')}
    </div>
  );
}
