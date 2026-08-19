'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  generatePotAwareRoundRobinRounds,
  generatePotAwareKnockoutPairings,
  pairDoublesFromPots,
} from '@/lib/fixtureGenerator';
import { dayFixtureWinnerId, competitorLabel } from '@/lib/dayTournamentUtils';
import {
  DayTournamentPlayer,
  DayTournament,
  DayTournamentPot,
  DayTournamentEntrant,
  DayTournamentCompetitor,
  DayTournamentRound,
  DayTournamentFixture,
  DayTournamentSport,
  DayTournamentEntryType,
  DayTournamentFormat,
  DayTournamentPotMode,
} from '@/types';

interface DayTournamentAdminDashboardProps {
  initialPlayers: DayTournamentPlayer[];
  initialTournaments: DayTournament[];
}

function roundNameForSize(numCompetitors: number): string {
  if (numCompetitors <= 2) return 'Final';
  if (numCompetitors <= 4) return 'Semi-Final';
  if (numCompetitors <= 8) return 'Quarter-Final';
  return `Round of ${numCompetitors}`;
}

export default function DayTournamentAdminDashboard({ initialPlayers, initialTournaments }: DayTournamentAdminDashboardProps) {
  const [players, setPlayers] = useState<DayTournamentPlayer[]>(initialPlayers);
  const [tournaments, setTournaments] = useState<DayTournament[]>(initialTournaments);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');

  const [newName, setNewName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newSport, setNewSport] = useState<DayTournamentSport>('darts');
  const [newEntryType, setNewEntryType] = useState<DayTournamentEntryType>('singles');
  const [newFormat, setNewFormat] = useState<DayTournamentFormat>('knockout');
  const [newLegsPerGame, setNewLegsPerGame] = useState('3');
  const [newPotMode, setNewPotMode] = useState<DayTournamentPotMode>('single');

  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(
    initialTournaments[0]?.id || null
  );
  const [pots, setPots] = useState<DayTournamentPot[]>([]);
  const [entrants, setEntrants] = useState<DayTournamentEntrant[]>([]);
  const [competitors, setCompetitors] = useState<DayTournamentCompetitor[]>([]);
  const [rounds, setRounds] = useState<DayTournamentRound[]>([]);
  const [fixtures, setFixtures] = useState<DayTournamentFixture[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [newPotName, setNewPotName] = useState('');
  const [genGamesPerCompetitor, setGenGamesPerCompetitor] = useState('1');
  const [genRoundLabel, setGenRoundLabel] = useState('Round');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPairing, setIsPairing] = useState(false);

  const [editingFixtureId, setEditingFixtureId] = useState<string | null>(null);
  const [scoreC1, setScoreC1] = useState('');
  const [scoreC2, setScoreC2] = useState('');

  const selectedTournament = tournaments.find((t) => t.id === selectedTournamentId) || null;
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const sortedRounds = [...rounds].sort((a, b) => a.sequence_order - b.sequence_order);
  const latestRound = sortedRounds[sortedRounds.length - 1];
  const latestRoundFixtures = latestRound ? fixtures.filter((f) => f.round_id === latestRound.id) : [];
  const sortedPots = [...pots].sort((a, b) => a.sequence_order - b.sequence_order);

  const competitorMap = new Map(competitors.map((c) => [c.id, c]));
  const entrantByPlayerId = new Map(entrants.map((e) => [e.player_id, e]));

  const loadTournamentDetail = async (tournamentId: string) => {
    setLoadingDetail(true);
    const [{ data: potData }, { data: entrantData }, { data: competitorData }, { data: roundData }] = await Promise.all([
      supabase.from('day_tournament_pots').select('*').eq('tournament_id', tournamentId).order('sequence_order'),
      supabase.from('day_tournament_entrants').select('*').eq('tournament_id', tournamentId),
      supabase.from('day_tournament_competitors').select('*').eq('tournament_id', tournamentId),
      supabase.from('day_tournament_rounds').select('*').eq('tournament_id', tournamentId).order('sequence_order'),
    ]);
    const roundIds = ((roundData as DayTournamentRound[]) || []).map((r) => r.id);
    const { data: fixtureData } = roundIds.length
      ? await supabase.from('day_tournament_fixtures').select('*').in('round_id', roundIds)
      : { data: [] as DayTournamentFixture[] };

    setPots((potData as DayTournamentPot[]) || []);
    setEntrants((entrantData as DayTournamentEntrant[]) || []);
    setCompetitors((competitorData as DayTournamentCompetitor[]) || []);
    setRounds((roundData as DayTournamentRound[]) || []);
    setFixtures((fixtureData as DayTournamentFixture[]) || []);
    setLoadingDetail(false);
  };

  useEffect(() => {
    if (selectedTournamentId) loadTournamentDetail(selectedTournamentId);
    else {
      setPots([]);
      setEntrants([]);
      setCompetitors([]);
      setRounds([]);
      setFixtures([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTournamentId]);

  // --- Roster ---------------------------------------------------------

  const addRosterPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    const { data, error } = await supabase.from('day_tournament_players').insert([{ name: newPlayerName.trim() }]).select().single();
    if (error) alert(error.message);
    else { setPlayers((prev) => [...prev, data]); setNewPlayerName(''); }
  };

  const startEditRosterPlayer = (p: { id: string; name: string }) => {
    setEditingPlayerId(p.id);
    setEditPlayerName(p.name);
  };
  const cancelEditRosterPlayer = () => { setEditingPlayerId(null); setEditPlayerName(''); };

  const renameRosterPlayer = async (playerId: string) => {
    const trimmed = editPlayerName.trim();
    if (!trimmed) return;
    const { error } = await supabase.from('day_tournament_players').update({ name: trimmed }).eq('id', playerId);
    if (error) alert(error.message);
    else {
      setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, name: trimmed } : p)));
      setEditingPlayerId(null);
      setEditPlayerName('');
    }
  };

  const deleteRosterPlayer = async (playerId: string, name: string) => {
    if (!confirm(`Delete ${name} from the one-day tournament roster?`)) return;
    const { error } = await supabase.from('day_tournament_players').delete().eq('id', playerId);
    if (error) alert(error.message);
    else setPlayers((prev) => prev.filter((p) => p.id !== playerId));
  };

  // --- Tournaments ------------------------------------------------------

  const createTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const legs = parseInt(newLegsPerGame, 10);
    const { data, error } = await supabase
      .from('day_tournaments')
      .insert([{
        name: newName.trim(),
        event_date: newEventDate || null,
        sport: newSport,
        entry_type: newEntryType,
        format: newFormat,
        legs_per_game: !isNaN(legs) && legs > 0 ? legs : 3,
        pot_mode: newPotMode,
        status: 'setup',
      }])
      .select()
      .single();
    if (error) alert(error.message);
    else {
      setTournaments((prev) => [data, ...prev]);
      setNewName(''); setNewEventDate(''); setNewLegsPerGame('3');
      setNewSport('darts'); setNewEntryType('singles'); setNewFormat('knockout'); setNewPotMode('single');
      setSelectedTournamentId(data.id);
    }
  };

  const deleteTournament = async (tournamentId: string, name: string) => {
    if (!confirm(`Delete tournament "${name}"? This removes its pots, entrants, pairings and fixtures too.`)) return;
    const { error } = await supabase.from('day_tournaments').delete().eq('id', tournamentId);
    if (error) alert(error.message);
    else {
      setTournaments((prev) => prev.filter((t) => t.id !== tournamentId));
      if (selectedTournamentId === tournamentId) setSelectedTournamentId(null);
    }
  };

  const markTournamentStatus = async (status: DayTournament['status']) => {
    if (!selectedTournamentId) return;
    const { error } = await supabase.from('day_tournaments').update({ status }).eq('id', selectedTournamentId);
    if (error) { alert(error.message); return; }
    setTournaments((prev) => prev.map((t) => (t.id === selectedTournamentId ? { ...t, status } : t)));
  };

  // --- Pots ---------------------------------------------------------------

  const addPot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournamentId || !newPotName.trim()) return;
    const nextSeq = pots.length > 0 ? Math.max(...pots.map((p) => p.sequence_order)) + 1 : 1;
    const { data, error } = await supabase
      .from('day_tournament_pots')
      .insert([{ tournament_id: selectedTournamentId, name: newPotName.trim(), sequence_order: nextSeq }])
      .select()
      .single();
    if (error) alert(error.message);
    else { setPots((prev) => [...prev, data]); setNewPotName(''); }
  };

  const deletePot = async (potId: string, name: string) => {
    if (!confirm(`Delete pot "${name}"? Entrants in it will become unassigned.`)) return;
    const { error } = await supabase.from('day_tournament_pots').delete().eq('id', potId);
    if (error) { alert(error.message); return; }
    setPots((prev) => prev.filter((p) => p.id !== potId));
    setEntrants((prev) => prev.map((e) => (e.pot_id === potId ? { ...e, pot_id: null } : e)));
  };

  // --- Entrants -------------------------------------------------------------

  const toggleEntrant = async (playerId: string) => {
    if (!selectedTournamentId) return;
    const existing = entrantByPlayerId.get(playerId);
    if (existing) {
      const { error } = await supabase.from('day_tournament_entrants').delete().eq('id', existing.id);
      if (error) alert(error.message);
      else setEntrants((prev) => prev.filter((e) => e.id !== existing.id));
    } else {
      const { data, error } = await supabase
        .from('day_tournament_entrants')
        .insert([{ tournament_id: selectedTournamentId, player_id: playerId, pot_id: null }])
        .select()
        .single();
      if (error) alert(error.message);
      else setEntrants((prev) => [...prev, data]);
    }
  };

  const setEntrantPot = async (entrantId: string, potId: string | null) => {
    const { error } = await supabase.from('day_tournament_entrants').update({ pot_id: potId }).eq('id', entrantId);
    if (error) { alert(error.message); return; }
    setEntrants((prev) => prev.map((e) => (e.id === entrantId ? { ...e, pot_id: potId } : e)));
  };

  // --- Doubles pairing --------------------------------------------------

  const clearCompetitors = async () => {
    if (!selectedTournamentId || competitors.length === 0) return;
    if (rounds.length > 0) { alert('Fixtures already exist — delete the rounds below first.'); return; }
    if (!confirm('Clear the current pairings and start again?')) return;
    const { error } = await supabase.from('day_tournament_competitors').delete().eq('tournament_id', selectedTournamentId);
    if (error) { alert(error.message); return; }
    setCompetitors([]);
  };

  const autoPairDoubles = async () => {
    if (!selectedTournamentId || !selectedTournament) return;
    if (rounds.length > 0) { alert('Fixtures have already been generated — clear the round(s) below first.'); return; }
    if (entrants.length < 2) { alert('Add at least 2 entrants first.'); return; }

    setIsPairing(true);
    try {
      if (competitors.length > 0) {
        const { error: delErr } = await supabase.from('day_tournament_competitors').delete().eq('tournament_id', selectedTournamentId);
        if (delErr) { alert(delErr.message); return; }
      }

      const { pairs, unpairedId } = pairDoublesFromPots(entrants.map((e) => ({ id: e.player_id, potId: e.pot_id })));
      if (pairs.length === 0) { alert('Could not form any pairs.'); return; }
      if (unpairedId) {
        const name = playerMap.get(unpairedId)?.name || 'One player';
        alert(`${name} is left without a partner (odd headcount) and won't be entered — add another entrant or remove them.`);
      }

      const rows = pairs.map(([p1, p2]) => ({ tournament_id: selectedTournamentId, player_1_id: p1, player_2_id: p2 }));
      const { data, error } = await supabase.from('day_tournament_competitors').insert(rows).select();
      if (error) { alert(error.message); return; }
      setCompetitors((data as DayTournamentCompetitor[]) || []);
    } finally {
      setIsPairing(false);
    }
  };

  /** For singles, competitors are a 1:1 mirror of entrants — created lazily
   * right before fixtures are generated. Returns the up-to-date competitor
   * list (existing state plus anything just created). */
  const ensureSinglesCompetitors = async (): Promise<DayTournamentCompetitor[]> => {
    if (!selectedTournamentId) return competitors;
    const existingByPlayer = new Set(competitors.map((c) => c.player_1_id));
    const missing = entrants.filter((e) => !existingByPlayer.has(e.player_id));
    if (missing.length === 0) return competitors;

    const rows = missing.map((e) => ({ tournament_id: selectedTournamentId, player_1_id: e.player_id, player_2_id: null }));
    const { data, error } = await supabase.from('day_tournament_competitors').insert(rows).select();
    if (error) { alert(error.message); return competitors; }
    const updated = [...competitors, ...((data as DayTournamentCompetitor[]) || [])];
    setCompetitors(updated);
    return updated;
  };

  const potOfCompetitor = (c: DayTournamentCompetitor): string | null => {
    const entrant = entrantByPlayerId.get(c.player_1_id);
    return entrant ? entrant.pot_id : null;
  };

  // --- Fixture generation -------------------------------------------------

  const generateLeagueFixtures = async () => {
    if (!selectedTournamentId || !selectedTournament) return;
    const gpc = parseInt(genGamesPerCompetitor, 10);
    if (isNaN(gpc) || gpc < 1) { alert('Enter a valid number of games per competitor.'); return; }

    setIsGenerating(true);
    try {
      const activeCompetitors = selectedTournament.entry_type === 'singles' ? await ensureSinglesCompetitors() : competitors;
      if (activeCompetitors.length < 2) {
        alert(selectedTournament.entry_type === 'doubles' ? 'Pair up at least 2 doubles teams first.' : 'Add at least 2 entrants first.');
        return;
      }

      const potOf = new Map<string, string | null>(activeCompetitors.map((c) => [c.id, potOfCompetitor(c)]));
      const roundsPairs = generatePotAwareRoundRobinRounds(activeCompetitors.map((c) => c.id), gpc, potOf);
      if (roundsPairs.length === 0) { alert('Could not generate fixtures with those settings.'); return; }

      let nextSequence = rounds.length > 0 ? Math.max(...rounds.map((r) => r.sequence_order)) + 1 : 1;
      const newRounds: DayTournamentRound[] = [];
      const newFixtures: DayTournamentFixture[] = [];

      for (const round of roundsPairs) {
        const label = `${genRoundLabel.trim() || 'Round'} ${nextSequence}`;
        const { data: roundData, error: roundError } = await supabase
          .from('day_tournament_rounds')
          .insert([{ tournament_id: selectedTournamentId, name: label, sequence_order: nextSequence }])
          .select()
          .single();
        if (roundError || !roundData) { alert(roundError?.message || 'Failed to create round.'); break; }
        newRounds.push(roundData);
        nextSequence += 1;

        const rows: Partial<DayTournamentFixture>[] = round.pairs.map(([c1, c2]) => ({
          round_id: roundData.id, competitor_1_id: c1, competitor_2_id: c2,
          competitor_1_score: 0, competitor_2_score: 0, completed: false, is_bye: false, best_of: selectedTournament.legs_per_game,
        }));
        if (round.byePlayerId) {
          rows.push({ round_id: roundData.id, competitor_1_id: round.byePlayerId, competitor_2_id: null, completed: true, is_bye: true, competitor_1_score: 1, competitor_2_score: 0, best_of: selectedTournament.legs_per_game });
        }
        if (rows.length === 0) continue;

        const { data: fixtureData, error: fixtureError } = await supabase.from('day_tournament_fixtures').insert(rows).select();
        if (fixtureError) {
          alert(fixtureError.message);
          await supabase.from('day_tournament_rounds').delete().eq('id', roundData.id);
          newRounds.pop();
          break;
        }
        if (fixtureData) newFixtures.push(...fixtureData);
      }

      setRounds((prev) => [...prev, ...newRounds]);
      setFixtures((prev) => [...prev, ...newFixtures]);
      if (selectedTournament.status === 'setup') await markTournamentStatus('active');
    } finally {
      setIsGenerating(false);
    }
  };

  const startKnockout = async () => {
    if (!selectedTournamentId || !selectedTournament) return;
    if (rounds.length > 0) { alert('This bracket has already been started.'); return; }

    setIsGenerating(true);
    try {
      const activeCompetitors = selectedTournament.entry_type === 'singles' ? await ensureSinglesCompetitors() : competitors;
      if (activeCompetitors.length < 2) {
        alert(selectedTournament.entry_type === 'doubles' ? 'Pair up at least 2 doubles teams first.' : 'Add at least 2 entrants first.');
        return;
      }

      const potOf = new Map<string, string | null>(activeCompetitors.map((c) => [c.id, potOfCompetitor(c)]));
      const { pairs, byePlayerId } = generatePotAwareKnockoutPairings(activeCompetitors.map((c) => c.id), potOf);

      const { data: roundData, error: roundError } = await supabase
        .from('day_tournament_rounds')
        .insert([{ tournament_id: selectedTournamentId, name: roundNameForSize(activeCompetitors.length), sequence_order: 1 }])
        .select()
        .single();
      if (roundError || !roundData) { alert(roundError?.message || 'Failed to create round.'); return; }

      const rows: Partial<DayTournamentFixture>[] = pairs.map(([c1, c2]) => ({
        round_id: roundData.id, competitor_1_id: c1, competitor_2_id: c2,
        competitor_1_score: 0, competitor_2_score: 0, completed: false, is_bye: false, best_of: selectedTournament.legs_per_game,
      }));
      if (byePlayerId) rows.push({ round_id: roundData.id, competitor_1_id: byePlayerId, competitor_2_id: null, completed: true, is_bye: true, competitor_1_score: 1, competitor_2_score: 0, best_of: selectedTournament.legs_per_game });

      const { data: fixtureData, error: fixtureError } = await supabase.from('day_tournament_fixtures').insert(rows).select();
      if (fixtureError) {
        alert(fixtureError.message);
        await supabase.from('day_tournament_rounds').delete().eq('id', roundData.id);
        return;
      }

      setRounds((prev) => [...prev, roundData]);
      setFixtures((prev) => [...prev, ...((fixtureData as DayTournamentFixture[]) || [])]);
      await markTournamentStatus('active');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateNextKnockoutRound = async () => {
    if (!selectedTournamentId || !latestRound || !selectedTournament) return;
    if (latestRoundFixtures.length === 0) {
      alert('This round has no fixtures in it (likely a leftover from a failed generation) — delete it below using "Delete Round", then try generating again.');
      return;
    }
    if (latestRoundFixtures.some((f) => !f.completed)) {
      alert('Enter results for every match in the current round first.');
      return;
    }
    const winners = latestRoundFixtures.map((f) => dayFixtureWinnerId(f)).filter((id): id is string => !!id);
    if (winners.length <= 1) {
      await markTournamentStatus('completed');
      alert('Tournament complete — champion decided!');
      return;
    }

    setIsGenerating(true);
    try {
      const potOf = new Map<string, string | null>(competitors.map((c) => [c.id, potOfCompetitor(c)]));
      const { pairs, byePlayerId } = generatePotAwareKnockoutPairings(winners, potOf);
      const nextSequence = Math.max(...rounds.map((r) => r.sequence_order)) + 1;
      const { data: roundData, error: roundError } = await supabase
        .from('day_tournament_rounds')
        .insert([{ tournament_id: selectedTournamentId, name: roundNameForSize(winners.length), sequence_order: nextSequence }])
        .select()
        .single();
      if (roundError || !roundData) { alert(roundError?.message || 'Failed to create round.'); return; }

      const rows: Partial<DayTournamentFixture>[] = pairs.map(([c1, c2]) => ({
        round_id: roundData.id, competitor_1_id: c1, competitor_2_id: c2,
        competitor_1_score: 0, competitor_2_score: 0, completed: false, is_bye: false, best_of: selectedTournament.legs_per_game,
      }));
      if (byePlayerId) rows.push({ round_id: roundData.id, competitor_1_id: byePlayerId, competitor_2_id: null, completed: true, is_bye: true, competitor_1_score: 1, competitor_2_score: 0, best_of: selectedTournament.legs_per_game });

      const { data: fixtureData, error: fixtureError } = await supabase.from('day_tournament_fixtures').insert(rows).select();
      if (fixtureError) {
        alert(fixtureError.message);
        await supabase.from('day_tournament_rounds').delete().eq('id', roundData.id);
        return;
      }

      setRounds((prev) => [...prev, roundData]);
      setFixtures((prev) => [...prev, ...((fixtureData as DayTournamentFixture[]) || [])]);
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteRound = async (roundId: string, roundName: string) => {
    if (!confirm(`Delete round "${roundName}" and all its fixtures? Use this to clean up a broken/empty round.`)) return;
    const { error } = await supabase.from('day_tournament_rounds').delete().eq('id', roundId);
    if (error) { alert(error.message); return; }
    setRounds((prev) => prev.filter((r) => r.id !== roundId));
    setFixtures((prev) => prev.filter((f) => f.round_id !== roundId));
    if (selectedTournament?.status === 'completed') await markTournamentStatus('active');
  };

  const submitScore = async (fixtureId: string) => {
    const s1 = parseInt(scoreC1, 10);
    const s2 = parseInt(scoreC2, 10);
    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0 || s1 === s2) {
      alert('Enter valid scores — draws are not supported for knockout/league progression.');
      return;
    }
    const { error } = await supabase.from('day_tournament_fixtures').update({ competitor_1_score: s1, competitor_2_score: s2, completed: true }).eq('id', fixtureId);
    if (error) { alert(error.message); return; }
    setFixtures((prev) => prev.map((f) => (f.id === fixtureId ? { ...f, competitor_1_score: s1, competitor_2_score: s2, completed: true } : f)));
    setEditingFixtureId(null); setScoreC1(''); setScoreC2('');
  };

  const deleteFixture = async (fixtureId: string) => {
    if (!confirm('Delete this fixture?')) return;
    const { error } = await supabase.from('day_tournament_fixtures').delete().eq('id', fixtureId);
    if (error) alert(error.message);
    else setFixtures((prev) => prev.filter((f) => f.id !== fixtureId));
  };

  const nameFor = (competitorId: string): string => {
    const c = competitorMap.get(competitorId);
    return c ? competitorLabel(c, playerMap) : '?';
  };

  const renderFixtureCard = (f: DayTournamentFixture) => {
    const isEditing = editingFixtureId === f.id;
    return (
      <div key={f.id} className="bg-charcoal-950 border border-emerald-900/30 rounded-lg p-3 space-y-2">
        {f.slot_code && <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">{f.slot_code}</p>}
        <div className="flex items-center justify-between text-sm gap-2">
          <span className={`font-bold truncate max-w-[110px] ${f.is_bye || (f.completed && f.competitor_1_score > f.competitor_2_score) ? 'text-emerald-400' : 'text-gray-200'}`}>{nameFor(f.competitor_1_id)}</span>
          <span className="font-mono font-black text-white px-2 shrink-0">
            {f.is_bye ? 'BYE' : f.completed ? `${f.competitor_1_score}-${f.competitor_2_score}` : 'VS'}
          </span>
          <span className={`font-bold truncate max-w-[110px] text-right ${f.completed && f.competitor_2_score > f.competitor_1_score ? 'text-emerald-400' : 'text-gray-200'}`}>{f.is_bye ? '—' : f.competitor_2_id ? nameFor(f.competitor_2_id) : '?'}</span>
        </div>
        {!f.is_bye && (
          isEditing ? (
            <div className="space-y-2">
              <div className="flex gap-2 items-center justify-center">
                <input type="number" min="0" value={scoreC1} onChange={(e) => setScoreC1(e.target.value)} placeholder="Legs"
                  className="w-14 bg-charcoal-900 border border-emerald-700 rounded px-2 py-1 text-sm text-white text-center focus:outline-none" />
                <span className="text-gray-500 text-xs">-</span>
                <input type="number" min="0" value={scoreC2} onChange={(e) => setScoreC2(e.target.value)} placeholder="Legs"
                  className="w-14 bg-charcoal-900 border border-emerald-700 rounded px-2 py-1 text-sm text-white text-center focus:outline-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => submitScore(f.id)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-1.5 rounded transition-colors">Save</button>
                <button onClick={() => { setEditingFixtureId(null); setScoreC1(''); setScoreC2(''); }} className="text-gray-500 hover:text-gray-300 text-xs px-2">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1">
              <button onClick={() => { setEditingFixtureId(f.id); setScoreC1(f.completed ? String(f.competitor_1_score) : ''); setScoreC2(f.completed ? String(f.competitor_2_score) : ''); }}
                className={`text-xs font-bold py-1.5 rounded transition-colors ${f.completed ? 'bg-charcoal-800 text-gray-400 hover:bg-charcoal-700' : 'bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60'}`}>
                {f.completed ? 'Edit Score' : 'Enter Score'}
              </button>
              <button onClick={() => deleteFixture(f.id)} className="text-xs font-bold py-1.5 rounded transition-colors bg-rose-900/40 text-rose-400 hover:bg-rose-900/60">Delete</button>
            </div>
          )
        )}
      </div>
    );
  };

  const renderRoundBlock = (r: DayTournamentRound) => {
    const rFixtures = fixtures.filter((f) => f.round_id === r.id);
    if (rFixtures.length === 0) {
      return (
        <div key={r.id} className="border border-rose-900/40 bg-rose-950/10 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">{r.name} — empty / broken round</p>
            <button onClick={() => deleteRound(r.id, r.name)} className="text-[10px] font-bold text-rose-500 hover:text-rose-400">Delete Round</button>
          </div>
        </div>
      );
    }
    return (
      <div key={r.id}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">{r.name}</p>
          <button onClick={() => deleteRound(r.id, r.name)} className="text-[10px] font-bold text-rose-500 hover:text-rose-400">Delete Round</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {rFixtures.map(renderFixtureCard)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-charcoal-900 p-4 rounded-xl border border-emerald-950">
        <h1 className="text-2xl font-black tracking-tight text-white">One-Day Tournament — Admin Dashboard</h1>
        <p className="text-xs text-emerald-400 font-medium">Set up a single-day darts or pool event: singles or doubles, knockout or league</p>
      </div>

      {/* Roster */}
      <div className="bg-charcoal-900 border border-emerald-950 p-5 rounded-xl space-y-4">
        <h2 className="text-lg font-bold text-white border-b border-charcoal-800 pb-2">Entrant Roster</h2>
        <form onSubmit={addRosterPlayer} className="flex gap-2">
          <input type="text" placeholder="Player Name" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)}
            className="flex-1 bg-charcoal-950 border border-emerald-900/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500" />
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">Add</button>
        </form>
        {players.length > 0 && (
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {players.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm text-gray-300 px-3 py-1.5 bg-charcoal-950 rounded-lg gap-2">
                {editingPlayerId === p.id ? (
                  <>
                    <input type="text" value={editPlayerName} onChange={(e) => setEditPlayerName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') renameRosterPlayer(p.id); if (e.key === 'Escape') cancelEditRosterPlayer(); }}
                      autoFocus className="flex-1 bg-charcoal-900 border border-emerald-900/60 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-emerald-500" />
                    <button onClick={() => renameRosterPlayer(p.id)} className="text-emerald-400 hover:text-emerald-300 text-xs font-bold transition-colors">Save</button>
                    <button onClick={cancelEditRosterPlayer} className="text-gray-500 hover:text-gray-400 text-xs font-bold transition-colors">Cancel</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 truncate">{p.name}</span>
                    <button onClick={() => startEditRosterPlayer(p)} className="text-amber-400 hover:text-amber-300 text-xs font-bold transition-colors">Rename</button>
                    <button onClick={() => deleteRosterPlayer(p.id, p.name)} className="text-rose-500 hover:text-rose-400 text-xs font-bold transition-colors">Delete</button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tournaments */}
      <div className="bg-charcoal-900 border border-emerald-950 p-5 rounded-xl space-y-4">
        <h2 className="text-lg font-bold text-white border-b border-charcoal-800 pb-2">Tournaments</h2>
        <form onSubmit={createTournament} className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <input type="text" placeholder="Tournament name" value={newName} onChange={(e) => setNewName(e.target.value)}
              className="bg-charcoal-950 border border-emerald-900/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500" />
            <input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)}
              className="bg-charcoal-950 border border-emerald-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="block text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Sport</label>
              <select value={newSport} onChange={(e) => setNewSport(e.target.value as DayTournamentSport)}
                className="w-full bg-charcoal-950 border border-emerald-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                <option value="darts">🎯 Darts</option>
                <option value="pool">🎱 Pool</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Entry Type</label>
              <select value={newEntryType} onChange={(e) => setNewEntryType(e.target.value as DayTournamentEntryType)}
                className="w-full bg-charcoal-950 border border-emerald-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                <option value="singles">Singles</option>
                <option value="doubles">Doubles</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Format</label>
              <select value={newFormat} onChange={(e) => setNewFormat(e.target.value as DayTournamentFormat)}
                className="w-full bg-charcoal-950 border border-emerald-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                <option value="knockout">Knockout</option>
                <option value="league">League</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Legs per Game</label>
              <input type="number" min="1" value={newLegsPerGame} onChange={(e) => setNewLegsPerGame(e.target.value)}
                className="w-full bg-charcoal-950 border border-emerald-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Pots</label>
              <select value={newPotMode} onChange={(e) => setNewPotMode(e.target.value as DayTournamentPotMode)}
                className="w-full bg-charcoal-950 border border-emerald-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                <option value="single">One pot (anyone can face anyone)</option>
                <option value="multiple">Separate pots</option>
              </select>
            </div>
          </div>
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">Create Tournament</button>
        </form>

        {tournaments.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {tournaments.map((t) => (
              <button key={t.id} onClick={() => setSelectedTournamentId(t.id)}
                className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  selectedTournamentId === t.id ? 'bg-emerald-950/50 border-emerald-600' : 'bg-charcoal-950 border-charcoal-800 hover:border-emerald-800'
                }`}>
                <p className="text-sm font-bold text-white">{t.name}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {t.sport === 'darts' ? '🎯' : '🎱'} {t.sport} · {t.entry_type} · {t.format} · {t.status}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Tournament Management */}
      {selectedTournament && (
        <div className="bg-charcoal-900 border border-emerald-950 p-5 rounded-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-charcoal-800 pb-2">
            <h2 className="text-lg font-bold text-white">
              Managing: {selectedTournament.name}{' '}
              <span className="text-emerald-400 text-sm capitalize">
                ({selectedTournament.sport === 'darts' ? '🎯' : '🎱'} {selectedTournament.sport} · {selectedTournament.entry_type} · {selectedTournament.format})
              </span>
            </h2>
            <button onClick={() => deleteTournament(selectedTournament.id, selectedTournament.name)}
              className="text-xs font-bold text-rose-500 hover:text-rose-400">Delete Tournament</button>
          </div>

          {loadingDetail ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : (
            <>
              {/* Pots */}
              {selectedTournament.pot_mode === 'multiple' && (
                <div>
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">
                    Pots {rounds.length > 0 && <span className="text-gray-600 normal-case">— locked once fixtures are generated</span>}
                  </p>
                  {!(rounds.length > 0) && (
                    <form onSubmit={addPot} className="flex gap-2 mb-2">
                      <input type="text" placeholder="Pot name (e.g. Pot A)" value={newPotName} onChange={(e) => setNewPotName(e.target.value)}
                        className="flex-1 bg-charcoal-950 border border-emerald-900/60 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500" />
                      <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors">Add Pot</button>
                    </form>
                  )}
                  {sortedPots.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {sortedPots.map((pot) => (
                        <span key={pot.id} className="inline-flex items-center gap-2 bg-charcoal-950 border border-emerald-900/40 rounded-full px-3 py-1 text-xs text-gray-300">
                          {pot.name}
                          {!(rounds.length > 0) && (
                            <button onClick={() => deletePot(pot.id, pot.name)} className="text-rose-500 hover:text-rose-400 font-bold">×</button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Entrants */}
              <div>
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">
                  Entrants ({entrants.length}) {rounds.length > 0 && <span className="text-gray-600 normal-case">— locked once fixtures are generated</span>}
                </p>
                <div className="grid gap-1.5 max-h-56 overflow-y-auto">
                  {players.map((p) => {
                    const entrant = entrantByPlayerId.get(p.id);
                    return (
                      <div key={p.id} className={`flex items-center gap-2 text-sm text-gray-300 px-2 py-1.5 bg-charcoal-950 rounded-lg ${rounds.length > 0 ? 'opacity-50' : ''}`}>
                        <label className={`flex items-center gap-2 flex-1 min-w-0 select-none ${rounds.length > 0 ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          <input type="checkbox" checked={!!entrant} disabled={rounds.length > 0}
                            onChange={() => toggleEntrant(p.id)} className="accent-emerald-600" />
                          <span className="truncate">{p.name}</span>
                        </label>
                        {entrant && selectedTournament.pot_mode === 'multiple' && sortedPots.length > 0 && (
                          <select value={entrant.pot_id || ''} disabled={rounds.length > 0}
                            onChange={(e) => setEntrantPot(entrant.id, e.target.value || null)}
                            className="bg-charcoal-900 border border-emerald-900/60 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500">
                            <option value="">No pot</option>
                            {sortedPots.map((pot) => (
                              <option key={pot.id} value={pot.id}>{pot.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Doubles pairing */}
              {selectedTournament.entry_type === 'doubles' && rounds.length === 0 && (
                <div className="border border-emerald-900/40 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-bold text-white">Pair Players (Doubles)</p>
                  <p className="text-xs text-gray-500">
                    {selectedTournament.pot_mode === 'multiple'
                      ? 'Pairs each entrant with someone from a different pot wherever possible, so teams are drawn from separate pots.'
                      : 'Randomly pairs up entrants into doubles teams.'}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={autoPairDoubles} disabled={isPairing}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 disabled:text-emerald-700 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">
                      {isPairing ? 'Pairing...' : competitors.length > 0 ? 'Re-Pair Players' : 'Pair Players'}
                    </button>
                    {competitors.length > 0 && (
                      <button onClick={clearCompetitors} className="text-xs font-bold text-rose-500 hover:text-rose-400 px-2">Clear Pairs</button>
                    )}
                  </div>
                  {competitors.length > 0 && (
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {competitors.map((c) => (
                        <div key={c.id} className="text-sm text-gray-200 bg-charcoal-950 rounded-lg px-3 py-1.5">{competitorLabel(c, playerMap)}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Generator */}
              {rounds.length === 0 && (
                selectedTournament.format === 'league' ? (
                  <div className="border border-emerald-900/40 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-bold text-white">Generate League Fixtures</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1.5">Games per Competitor</label>
                        <input type="number" min="1" value={genGamesPerCompetitor} onChange={(e) => setGenGamesPerCompetitor(e.target.value)}
                          className="w-full bg-charcoal-950 border border-emerald-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1.5">Round Label Prefix</label>
                        <input type="text" value={genRoundLabel} onChange={(e) => setGenRoundLabel(e.target.value)}
                          className="w-full bg-charcoal-950 border border-emerald-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
                      </div>
                      <div className="flex items-end">
                        <button onClick={generateLeagueFixtures} disabled={isGenerating}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 disabled:text-emerald-700 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">
                          {isGenerating ? 'Generating...' : 'Generate Fixtures'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border border-emerald-900/40 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-bold text-white">Start Knockout Bracket</p>
                    <p className="text-xs text-gray-500">Pairs up all competitors for Round 1{selectedTournament.pot_mode === 'multiple' ? ', keeping same-pot competitors apart wherever possible' : ''}. If there&apos;s an odd number, one gets a bye.</p>
                    <button onClick={startKnockout} disabled={isGenerating}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 disabled:text-emerald-700 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">
                      {isGenerating ? 'Generating...' : 'Generate Round 1'}
                    </button>
                  </div>
                )
              )}

              {/* Knockout: advance round */}
              {selectedTournament.format === 'knockout' && rounds.length > 0 && selectedTournament.status !== 'completed' && (
                <div className="border border-emerald-900/40 rounded-xl p-4">
                  <button onClick={generateNextKnockoutRound} disabled={isGenerating}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 disabled:text-emerald-700 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">
                    {isGenerating ? 'Generating...' : 'Generate Next Round'}
                  </button>
                  <p className="text-xs text-gray-500 mt-2">All matches in the current round must be completed first.</p>
                </div>
              )}

              {/* Fixtures */}
              {rounds.length > 0 && (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Fixtures — Best of {selectedTournament.legs_per_game} legs</p>
                  {sortedRounds.map(renderRoundBlock)}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
