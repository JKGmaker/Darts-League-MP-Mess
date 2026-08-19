'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { generateKnockoutPairings } from '@/lib/fixtureGenerator';
import { generatePotSafeKnockoutPairings, pairDoublesFromPots, roundNameForSize, dayFixtureWinnerId } from '@/lib/dayTournamentUtils';
import {
  DayTournament,
  DayTournamentEntrant,
  DayTournamentCompetitor,
  DayTournamentRound,
  DayTournamentFixture,
  DayTournamentSport,
  DayTournamentMode,
  DayTournamentPotMode,
} from '@/types';

interface RosterPlayer {
  id: string;
  name: string;
}

interface DayTournamentAdminProps {
  initialTournaments: DayTournament[];
  dartsPlayers: RosterPlayer[];
  poolPlayers: RosterPlayer[];
}

export default function DayTournamentAdmin({ initialTournaments, dartsPlayers, poolPlayers }: DayTournamentAdminProps) {
  const [tournaments, setTournaments] = useState<DayTournament[]>(initialTournaments);

  // New tournament form
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newSport, setNewSport] = useState<DayTournamentSport>('darts');
  const [newMode, setNewMode] = useState<DayTournamentMode>('singles');
  const [newLegs, setNewLegs] = useState('3');
  const [newPotMode, setNewPotMode] = useState<DayTournamentPotMode>('single');
  const [newPotCount, setNewPotCount] = useState('2');

  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(initialTournaments[0]?.id || null);
  const [entrants, setEntrants] = useState<DayTournamentEntrant[]>([]);
  const [competitors, setCompetitors] = useState<DayTournamentCompetitor[]>([]);
  const [rounds, setRounds] = useState<DayTournamentRound[]>([]);
  const [fixtures, setFixtures] = useState<DayTournamentFixture[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const [guestName, setGuestName] = useState('');
  const [rosterPick, setRosterPick] = useState('');

  const [editingFixtureId, setEditingFixtureId] = useState<string | null>(null);
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');

  const selectedTournament = tournaments.find((t) => t.id === selectedTournamentId) || null;
  const entrantMap = new Map(entrants.map((e) => [e.id, e]));
  const competitorMap = new Map(competitors.map((c) => [c.id, c]));
  const sortedRounds = [...rounds].sort((a, b) => a.sequence_order - b.sequence_order);
  const latestRound = sortedRounds[sortedRounds.length - 1];
  const latestRoundFixtures = latestRound ? fixtures.filter((f) => f.round_id === latestRound.id) : [];
  const unitLabel = selectedTournament?.sport === 'pool' ? 'Frames' : 'Legs';
  const selectedRoster = selectedTournament?.sport === 'pool' ? poolPlayers : dartsPlayers;
  const entrantsLocked = competitors.length > 0 || rounds.length > 0;

  const loadTournamentDetail = async (tournamentId: string) => {
    setLoadingDetail(true);
    const [{ data: entrantData }, { data: competitorData }, { data: roundData }] = await Promise.all([
      supabase.from('day_tournament_entrants').select('*').eq('tournament_id', tournamentId).order('created_at'),
      supabase.from('day_tournament_competitors').select('*').eq('tournament_id', tournamentId).order('created_at'),
      supabase.from('day_tournament_rounds').select('*').eq('tournament_id', tournamentId).order('sequence_order'),
    ]);
    const loadedRounds = (roundData as DayTournamentRound[]) || [];
    const roundIds = loadedRounds.map((r) => r.id);
    const { data: fixtureData } = roundIds.length
      ? await supabase.from('day_tournament_fixtures').select('*').in('round_id', roundIds)
      : { data: [] as DayTournamentFixture[] };

    setEntrants((entrantData as DayTournamentEntrant[]) || []);
    setCompetitors((competitorData as DayTournamentCompetitor[]) || []);
    setRounds(loadedRounds);
    setFixtures((fixtureData as DayTournamentFixture[]) || []);
    setLoadingDetail(false);
  };

  React.useEffect(() => {
    if (selectedTournamentId) loadTournamentDetail(selectedTournamentId);
    else {
      setEntrants([]);
      setCompetitors([]);
      setRounds([]);
      setFixtures([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTournamentId]);

  const createTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const legs = parseInt(newLegs, 10);
    const potCount = parseInt(newPotCount, 10);
    const { data, error } = await supabase
      .from('day_tournaments')
      .insert([{
        name: newName.trim(),
        event_date: newDate || null,
        sport: newSport,
        mode: newMode,
        legs_per_game: !isNaN(legs) && legs > 0 ? legs : 3,
        pot_mode: newPotMode,
        pot_count: newPotMode === 'multiple' && !isNaN(potCount) && potCount >= 2 ? potCount : (newPotMode === 'multiple' ? 2 : 1),
        status: 'setup',
      }])
      .select()
      .single();
    if (error) { alert(error.message); return; }
    setTournaments((prev) => [data, ...prev]);
    setSelectedTournamentId(data.id);
    setNewName(''); setNewDate(''); setNewLegs('3'); setNewPotMode('single'); setNewPotCount('2');
  };

  const deleteTournament = async (id: string, name: string) => {
    if (!confirm(`Delete tournament "${name}"? This removes all its entrants, teams, rounds and fixtures too.`)) return;
    const { error } = await supabase.from('day_tournaments').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    setTournaments((prev) => prev.filter((t) => t.id !== id));
    if (selectedTournamentId === id) setSelectedTournamentId(null);
  };

  const addEntrant = async (name: string) => {
    if (!selectedTournamentId || !name.trim()) return;
    const { data, error } = await supabase
      .from('day_tournament_entrants')
      .insert([{ tournament_id: selectedTournamentId, name: name.trim(), pot_number: 1 }])
      .select()
      .single();
    if (error) { alert(error.message); return; }
    setEntrants((prev) => [...prev, data]);
  };

  const addFromRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rosterPick) return;
    const already = entrants.some((en) => en.name.toLowerCase() === rosterPick.toLowerCase());
    if (already) { alert(`${rosterPick} is already entered.`); return; }
    await addEntrant(rosterPick);
    setRosterPick('');
  };

  const addGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    await addEntrant(guestName);
    setGuestName('');
  };

  const deleteEntrant = async (id: string) => {
    const { error } = await supabase.from('day_tournament_entrants').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    setEntrants((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEntrantPot = async (id: string, potNumber: number) => {
    const { error } = await supabase.from('day_tournament_entrants').update({ pot_number: potNumber }).eq('id', id);
    if (error) { alert(error.message); return; }
    setEntrants((prev) => prev.map((e) => (e.id === id ? { ...e, pot_number: potNumber } : e)));
  };

  const markStatus = async (status: DayTournament['status']) => {
    if (!selectedTournamentId) return;
    const { error } = await supabase.from('day_tournaments').update({ status }).eq('id', selectedTournamentId);
    if (error) { alert(error.message); return; }
    setTournaments((prev) => prev.map((t) => (t.id === selectedTournamentId ? { ...t, status } : t)));
  };

  // "Pair players" — doubles only. Auto-builds teams from pots and inserts
  // them as competitors.
  const pairPlayers = async () => {
    if (!selectedTournamentId || !selectedTournament) return;
    if (entrants.length < 4) { alert('Add at least 4 entrants to pair up doubles teams.'); return; }
    setIsBusy(true);
    try {
      const { teams, unpaired } = pairDoublesFromPots(entrants.map((e) => ({ id: e.id, potNumber: e.pot_number })));
      if (teams.length === 0) { alert('Could not form any teams from the current entrants.'); return; }

      const rows = teams.map(([id1, id2]) => {
        const n1 = entrantMap.get(id1)?.name || '?';
        const n2 = entrantMap.get(id2)?.name || '?';
        return {
          tournament_id: selectedTournamentId,
          display_name: `${n1} & ${n2}`,
          entrant_1_id: id1,
          entrant_2_id: id2,
          pot_number: null,
        };
      });
      const { data, error } = await supabase.from('day_tournament_competitors').insert(rows).select();
      if (error) { alert(error.message); return; }
      setCompetitors((prev) => [...prev, ...((data as DayTournamentCompetitor[]) || [])]);
      await markStatus('paired');

      if (unpaired.length > 0) {
        const names = unpaired.map((id) => entrantMap.get(id)?.name || '?').join(', ');
        alert(`Teams paired. ${names} had nobody left to pair with — add another entrant or delete them before generating fixtures.`);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const undoPairing = async () => {
    if (!selectedTournamentId) return;
    if (rounds.length > 0) { alert('Fixtures have already been generated — delete the rounds below first.'); return; }
    if (!confirm('Clear the current doubles pairing and start again?')) return;
    const { error } = await supabase.from('day_tournament_competitors').delete().eq('tournament_id', selectedTournamentId);
    if (error) { alert(error.message); return; }
    setCompetitors([]);
    await markStatus('setup');
  };

  // "Generate Fixtures" — builds Round 1 from competitors (creating 1:1
  // competitors from entrants first, for singles events).
  const generateFixtures = async () => {
    if (!selectedTournamentId || !selectedTournament) return;
    if (rounds.length > 0) { alert('Fixtures have already been generated for this event.'); return; }

    setIsBusy(true);
    try {
      let startingCompetitors = competitors;

      if (selectedTournament.mode === 'singles') {
        if (entrants.length < 2) { alert('Add at least 2 entrants first.'); return; }
        if (startingCompetitors.length === 0) {
          const rows = entrants.map((en) => ({
            tournament_id: selectedTournamentId,
            display_name: en.name,
            entrant_1_id: en.id,
            entrant_2_id: null,
            pot_number: en.pot_number,
          }));
          const { data, error } = await supabase.from('day_tournament_competitors').insert(rows).select();
          if (error) { alert(error.message); return; }
          startingCompetitors = (data as DayTournamentCompetitor[]) || [];
          setCompetitors(startingCompetitors);
        }
      } else if (startingCompetitors.length === 0) {
        alert('Pair up doubles teams first using the "Pair Players" button.');
        return;
      }

      if (startingCompetitors.length < 2) { alert('Need at least 2 competitors to generate a bracket.'); return; }

      let pairs: [string, string][];
      let byeId: string | null;
      if (selectedTournament.mode === 'singles' && selectedTournament.pot_mode === 'multiple') {
        const draw = generatePotSafeKnockoutPairings(startingCompetitors.map((c) => ({ id: c.id, potNumber: c.pot_number ?? 1 })));
        pairs = draw.pairs;
        byeId = draw.byeId;
        if (draw.clashes > 0) {
          alert(`Draw complete. ${draw.clashes} pairing(s) couldn't avoid sharing a pot — pot sizes didn't allow full separation.`);
        }
      } else {
        const draw = generateKnockoutPairings(startingCompetitors.map((c) => c.id));
        pairs = draw.pairs;
        byeId = draw.byePlayerId;
      }

      const { data: roundData, error: roundError } = await supabase
        .from('day_tournament_rounds')
        .insert([{ tournament_id: selectedTournamentId, name: roundNameForSize(startingCompetitors.length), sequence_order: 1 }])
        .select()
        .single();
      if (roundError || !roundData) { alert(roundError?.message || 'Failed to create round.'); return; }

      const rows: Partial<DayTournamentFixture>[] = pairs.map(([c1, c2]) => ({
        round_id: roundData.id, competitor_1_id: c1, competitor_2_id: c2, competitor_1_legs: 0, competitor_2_legs: 0, completed: false, is_bye: false,
      }));
      if (byeId) rows.push({ round_id: roundData.id, competitor_1_id: byeId, competitor_2_id: null, completed: true, is_bye: true, competitor_1_legs: 1, competitor_2_legs: 0 });

      const { data: fixtureData, error: fixtureError } = await supabase.from('day_tournament_fixtures').insert(rows).select();
      if (fixtureError) {
        alert(fixtureError.message);
        await supabase.from('day_tournament_rounds').delete().eq('id', roundData.id);
        return;
      }

      setRounds((prev) => [...prev, roundData]);
      setFixtures((prev) => [...prev, ...((fixtureData as DayTournamentFixture[]) || [])]);
      await markStatus('active');
    } finally {
      setIsBusy(false);
    }
  };

  const generateNextRound = async () => {
    if (!selectedTournamentId || !latestRound) return;
    if (latestRoundFixtures.length === 0) {
      alert('This round has no fixtures (likely a leftover from a failed generation) — delete it below, then try again.');
      return;
    }
    if (latestRoundFixtures.some((f) => !f.completed)) { alert('Enter results for every match in the current round first.'); return; }

    const winners = latestRoundFixtures.map((f) => dayFixtureWinnerId(f)).filter((id): id is string => !!id);
    if (winners.length <= 1) {
      await markStatus('completed');
      alert('Tournament complete — champion decided!');
      return;
    }

    setIsBusy(true);
    try {
      const { pairs, byePlayerId } = generateKnockoutPairings(winners);
      const nextSequence = Math.max(...rounds.map((r) => r.sequence_order)) + 1;
      const { data: roundData, error: roundError } = await supabase
        .from('day_tournament_rounds')
        .insert([{ tournament_id: selectedTournamentId, name: roundNameForSize(winners.length), sequence_order: nextSequence }])
        .select()
        .single();
      if (roundError || !roundData) { alert(roundError?.message || 'Failed to create round.'); return; }

      const rows: Partial<DayTournamentFixture>[] = pairs.map(([c1, c2]) => ({
        round_id: roundData.id, competitor_1_id: c1, competitor_2_id: c2, competitor_1_legs: 0, competitor_2_legs: 0, completed: false, is_bye: false,
      }));
      if (byePlayerId) rows.push({ round_id: roundData.id, competitor_1_id: byePlayerId, competitor_2_id: null, completed: true, is_bye: true, competitor_1_legs: 1, competitor_2_legs: 0 });

      const { data: fixtureData, error: fixtureError } = await supabase.from('day_tournament_fixtures').insert(rows).select();
      if (fixtureError) {
        alert(fixtureError.message);
        await supabase.from('day_tournament_rounds').delete().eq('id', roundData.id);
        return;
      }
      setRounds((prev) => [...prev, roundData]);
      setFixtures((prev) => [...prev, ...((fixtureData as DayTournamentFixture[]) || [])]);
    } finally {
      setIsBusy(false);
    }
  };

  const deleteRound = async (roundId: string, roundName: string) => {
    if (!confirm(`Delete round "${roundName}" and all its fixtures?`)) return;
    const { error } = await supabase.from('day_tournament_rounds').delete().eq('id', roundId);
    if (error) { alert(error.message); return; }
    setRounds((prev) => prev.filter((r) => r.id !== roundId));
    setFixtures((prev) => prev.filter((f) => f.round_id !== roundId));
    if (selectedTournament?.status === 'completed') await markStatus('active');
  };

  const deleteFixture = async (fixtureId: string) => {
    if (!confirm('Delete this fixture?')) return;
    const { error } = await supabase.from('day_tournament_fixtures').delete().eq('id', fixtureId);
    if (error) alert(error.message);
    else setFixtures((prev) => prev.filter((f) => f.id !== fixtureId));
  };

  const submitScore = async (fixtureId: string) => {
    const a = parseInt(scoreA, 10);
    const b = parseInt(scoreB, 10);
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0 || a === b) {
      alert('Enter valid scores — draws are not supported for knockout progression.');
      return;
    }
    const { error } = await supabase.from('day_tournament_fixtures').update({ competitor_1_legs: a, competitor_2_legs: b, completed: true }).eq('id', fixtureId);
    if (error) { alert(error.message); return; }
    setFixtures((prev) => prev.map((f) => (f.id === fixtureId ? { ...f, competitor_1_legs: a, competitor_2_legs: b, completed: true } : f)));
    setEditingFixtureId(null); setScoreA(''); setScoreB('');
  };

  const renderFixtureCard = (f: DayTournamentFixture) => {
    const c1 = competitorMap.get(f.competitor_1_id);
    const c2 = f.competitor_2_id ? competitorMap.get(f.competitor_2_id) : null;
    const isEditing = editingFixtureId === f.id;
    return (
      <div key={f.id} className="bg-charcoal-950 border border-violet-900/30 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className={`font-bold truncate max-w-[110px] ${f.is_bye || (f.completed && f.competitor_1_legs > f.competitor_2_legs) ? 'text-violet-400' : 'text-gray-200'}`}>{c1?.display_name || '?'}</span>
          <span className="font-mono font-black text-white px-2">
            {f.is_bye ? 'BYE' : f.completed ? `${f.competitor_1_legs}-${f.competitor_2_legs}` : 'VS'}
          </span>
          <span className={`font-bold truncate max-w-[110px] text-right ${f.completed && f.competitor_2_legs > f.competitor_1_legs ? 'text-violet-400' : 'text-gray-200'}`}>{f.is_bye ? '—' : c2?.display_name || '?'}</span>
        </div>
        {!f.is_bye && (
          isEditing ? (
            <div className="space-y-2">
              <div className="flex gap-2 items-center justify-center">
                <input type="number" min="0" value={scoreA} onChange={(e) => setScoreA(e.target.value)} placeholder={unitLabel}
                  className="w-16 bg-charcoal-900 border border-violet-700 rounded px-2 py-1 text-sm text-white text-center focus:outline-none" />
                <span className="text-gray-500 text-xs">-</span>
                <input type="number" min="0" value={scoreB} onChange={(e) => setScoreB(e.target.value)} placeholder={unitLabel}
                  className="w-16 bg-charcoal-900 border border-violet-700 rounded px-2 py-1 text-sm text-white text-center focus:outline-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => submitScore(f.id)} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold py-1.5 rounded transition-colors">Save</button>
                <button onClick={() => { setEditingFixtureId(null); setScoreA(''); setScoreB(''); }} className="text-gray-500 hover:text-gray-300 text-xs px-2">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1">
              <button onClick={() => { setEditingFixtureId(f.id); setScoreA(f.completed ? String(f.competitor_1_legs) : ''); setScoreB(f.completed ? String(f.competitor_2_legs) : ''); }}
                className={`text-xs font-bold py-1.5 rounded transition-colors ${f.completed ? 'bg-charcoal-800 text-gray-400 hover:bg-charcoal-700' : 'bg-violet-900/40 text-violet-400 hover:bg-violet-900/60'}`}>
                {f.completed ? `Edit ${unitLabel}` : `Enter ${unitLabel}`}
              </button>
              <button onClick={() => deleteFixture(f.id)} className="text-xs font-bold py-1.5 rounded transition-colors bg-rose-900/40 text-rose-400 hover:bg-rose-900/60">Delete</button>
            </div>
          )
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-charcoal-900 p-4 rounded-xl border border-violet-950">
        <h1 className="text-2xl font-black tracking-tight text-white">1-Day Tournament — Admin</h1>
        <p className="text-xs text-violet-400 font-medium">Set up a one-off knockout event for Darts or Pool</p>
      </div>

      {/* Create tournament */}
      <div className="bg-charcoal-900 border border-violet-950 p-5 rounded-xl space-y-4">
        <h2 className="text-lg font-bold text-white border-b border-charcoal-800 pb-2">New Tournament</h2>
        <form onSubmit={createTournament} className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <input type="text" placeholder="Tournament name (e.g. Christmas Cracker Open)" value={newName} onChange={(e) => setNewName(e.target.value)}
              className="bg-charcoal-950 border border-violet-900/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500" />
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
              className="bg-charcoal-950 border border-violet-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500" />
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-bold text-violet-400 uppercase tracking-widest mb-1.5">Sport</label>
              <select value={newSport} onChange={(e) => setNewSport(e.target.value as DayTournamentSport)}
                className="w-full bg-charcoal-950 border border-violet-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500">
                <option value="darts">🎯 Darts</option>
                <option value="pool">🎱 Pool</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-violet-400 uppercase tracking-widest mb-1.5">Entry</label>
              <select value={newMode} onChange={(e) => setNewMode(e.target.value as DayTournamentMode)}
                className="w-full bg-charcoal-950 border border-violet-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500">
                <option value="singles">Singles</option>
                <option value="doubles">Doubles</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-violet-400 uppercase tracking-widest mb-1.5">Format</label>
              <div className="w-full bg-charcoal-950 border border-charcoal-800 rounded-lg px-3 py-2 text-sm text-gray-400">🏆 Knockout</div>
            </div>
            <div>
              <label className="block text-xs font-bold text-violet-400 uppercase tracking-widest mb-1.5">{newSport === 'pool' ? 'Frames' : 'Legs'} / game</label>
              <input type="number" min="1" value={newLegs} onChange={(e) => setNewLegs(e.target.value)}
                className="w-full bg-charcoal-950 border border-violet-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500" />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 items-end">
            <div>
              <label className="block text-xs font-bold text-violet-400 uppercase tracking-widest mb-1.5">Pots</label>
              <select value={newPotMode} onChange={(e) => setNewPotMode(e.target.value as DayTournamentPotMode)}
                className="w-full bg-charcoal-950 border border-violet-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500">
                <option value="single">All players in one pot</option>
                <option value="multiple">Separate pots (keep pot-mates apart)</option>
              </select>
            </div>
            {newPotMode === 'multiple' && (
              <div>
                <label className="block text-xs font-bold text-violet-400 uppercase tracking-widest mb-1.5">Number of pots</label>
                <input type="number" min="2" max="6" value={newPotCount} onChange={(e) => setNewPotCount(e.target.value)}
                  className="w-full bg-charcoal-950 border border-violet-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500" />
              </div>
            )}
            <button type="submit" className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">Create Tournament</button>
          </div>
          {newMode === 'doubles' && (
            <p className="text-xs text-gray-500">Doubles teams are auto-paired one player from Pot 1 with one from Pot 2 — use at least 2 pots for balanced pairing.</p>
          )}
        </form>

        {tournaments.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {tournaments.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTournamentId(t.id)}
                className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  selectedTournamentId === t.id ? 'bg-violet-950/50 border-violet-600' : 'bg-charcoal-950 border-charcoal-800 hover:border-violet-800'
                }`}
              >
                <p className="text-sm font-bold text-white">{t.name}</p>
                <p className="text-xs text-gray-500 capitalize">{t.sport} · {t.mode} · {t.status}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected tournament management */}
      {selectedTournament && (
        <div className="bg-charcoal-900 border border-violet-950 p-5 rounded-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-charcoal-800 pb-2">
            <h2 className="text-lg font-bold text-white">
              Managing: {selectedTournament.name}{' '}
              <span className="text-violet-400 text-sm capitalize">
                ({selectedTournament.sport} · {selectedTournament.mode} · {unitLabel.toLowerCase()} to {selectedTournament.legs_per_game})
              </span>
            </h2>
            <button onClick={() => deleteTournament(selectedTournament.id, selectedTournament.name)}
              className="text-xs font-bold text-rose-500 hover:text-rose-400">Delete Tournament</button>
          </div>

          {loadingDetail ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : (
            <>
              {/* Entrants */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-violet-400 uppercase tracking-widest">
                  Entrants ({entrants.length}) {entrantsLocked && <span className="text-gray-600 normal-case">— locked once teams/fixtures exist</span>}
                </p>

                {!entrantsLocked && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <form onSubmit={addFromRoster} className="flex gap-2">
                      <select value={rosterPick} onChange={(e) => setRosterPick(e.target.value)}
                        className="flex-1 bg-charcoal-950 border border-violet-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500">
                        <option value="">Add from {selectedTournament.sport} roster…</option>
                        {selectedRoster.map((p) => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                      <button type="submit" className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">Add</button>
                    </form>
                    <form onSubmit={addGuest} className="flex gap-2">
                      <input type="text" placeholder="Add a guest / walk-up name" value={guestName} onChange={(e) => setGuestName(e.target.value)}
                        className="flex-1 bg-charcoal-950 border border-violet-900/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500" />
                      <button type="submit" className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">Add</button>
                    </form>
                  </div>
                )}

                {entrants.length > 0 && (
                  <ul className="space-y-1 max-h-56 overflow-y-auto">
                    {entrants.map((en) => (
                      <li key={en.id} className="flex items-center justify-between gap-2 text-sm text-gray-300 px-3 py-1.5 bg-charcoal-950 rounded-lg">
                        <span className="flex-1 truncate">{en.name}</span>
                        {selectedTournament.pot_mode === 'multiple' && (
                          <select
                            value={en.pot_number}
                            disabled={entrantsLocked}
                            onChange={(e) => updateEntrantPot(en.id, parseInt(e.target.value, 10))}
                            className="bg-charcoal-900 border border-violet-900/60 rounded px-2 py-1 text-xs text-white focus:outline-none disabled:opacity-50"
                          >
                            {Array.from({ length: selectedTournament.pot_count }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>Pot {n}</option>
                            ))}
                          </select>
                        )}
                        {!entrantsLocked && (
                          <button onClick={() => deleteEntrant(en.id)} className="text-rose-500 hover:text-rose-400 text-xs font-bold transition-colors">Remove</button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Doubles pairing */}
              {selectedTournament.mode === 'doubles' && rounds.length === 0 && (
                <div className="border border-violet-900/40 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-bold text-white">Pair Players (Doubles)</p>
                  <p className="text-xs text-gray-500">Automatically forms teams — one entrant from Pot 1 with one from Pot 2 — so partnerships come out balanced.</p>
                  {competitors.length === 0 ? (
                    <button onClick={pairPlayers} disabled={isBusy}
                      className="bg-violet-600 hover:bg-violet-500 disabled:bg-violet-900 disabled:text-violet-700 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">
                      {isBusy ? 'Pairing...' : 'Pair Players'}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {competitors.map((c) => (
                          <div key={c.id} className="text-sm text-gray-300 px-3 py-1.5 bg-charcoal-950 rounded-lg">{c.display_name}</div>
                        ))}
                      </div>
                      <button onClick={undoPairing} className="text-xs font-bold text-rose-500 hover:text-rose-400">Clear pairing and redo</button>
                    </div>
                  )}
                </div>
              )}

              {/* Generate fixtures */}
              {rounds.length === 0 && (
                <div className="border border-violet-900/40 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-bold text-white">Generate Fixtures</p>
                  <p className="text-xs text-gray-500">
                    {selectedTournament.mode === 'doubles'
                      ? 'Draws the Round 1 bracket from the paired-up teams above.'
                      : selectedTournament.pot_mode === 'multiple'
                        ? 'Randomly draws Round 1, keeping entrants from the same pot apart wherever the numbers allow.'
                        : 'Randomly draws Round 1. If there’s an odd number of entrants, one gets a bye.'}
                  </p>
                  <button onClick={generateFixtures} disabled={isBusy}
                    className="bg-violet-600 hover:bg-violet-500 disabled:bg-violet-900 disabled:text-violet-700 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">
                    {isBusy ? 'Generating...' : 'Generate Fixtures'}
                  </button>
                </div>
              )}

              {/* Advance round */}
              {rounds.length > 0 && selectedTournament.status !== 'completed' && (
                <div className="border border-violet-900/40 rounded-xl p-4">
                  <button onClick={generateNextRound} disabled={isBusy}
                    className="bg-violet-600 hover:bg-violet-500 disabled:bg-violet-900 disabled:text-violet-700 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">
                    {isBusy ? 'Generating...' : 'Generate Next Round'}
                  </button>
                  <p className="text-xs text-gray-500 mt-2">All matches in the current round must be completed first.</p>
                </div>
              )}

              {/* Fixtures */}
              {sortedRounds.length > 0 && (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-violet-400 uppercase tracking-widest">Bracket</p>
                  {sortedRounds.map((r) => {
                    const rFixtures = fixtures.filter((f) => f.round_id === r.id);
                    return (
                      <div key={r.id}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-violet-500 uppercase tracking-widest">{r.name}</p>
                          <button onClick={() => deleteRound(r.id, r.name)} className="text-[10px] font-bold text-rose-500 hover:text-rose-400">Delete Round</button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {rFixtures.map(renderFixtureCard)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
