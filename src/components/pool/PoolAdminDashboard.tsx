'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { generateRoundRobinRounds, generateKnockoutPairings } from '@/lib/fixtureGenerator';
import { fixtureWinnerId } from '@/lib/poolUtils';
import { PoolPlayer, PoolTournament, PoolRound, PoolFixture, PoolFormat } from '@/types';

interface PoolAdminDashboardProps {
  initialPlayers: PoolPlayer[];
  initialTournaments: PoolTournament[];
}

function roundNameForSize(numPlayers: number): string {
  if (numPlayers <= 2) return 'Final';
  if (numPlayers <= 4) return 'Semi-Final';
  if (numPlayers <= 8) return 'Quarter-Final';
  return `Round of ${numPlayers}`;
}

export default function PoolAdminDashboard({ initialPlayers, initialTournaments }: PoolAdminDashboardProps) {
  const [players, setPlayers] = useState<PoolPlayer[]>(initialPlayers);
  const [tournaments, setTournaments] = useState<PoolTournament[]>(initialTournaments);
  const [newPlayerName, setNewPlayerName] = useState('');

  const [newTournamentName, setNewTournamentName] = useState('');
  const [newTournamentFormat, setNewTournamentFormat] = useState<PoolFormat>('league');

  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(
    initialTournaments[0]?.id || null
  );
  const [rounds, setRounds] = useState<PoolRound[]>([]);
  const [fixtures, setFixtures] = useState<PoolFixture[]>([]);
  const [entrantIds, setEntrantIds] = useState<string[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [genGamesPerPlayer, setGenGamesPerPlayer] = useState('1');
  const [genWeekLabel, setGenWeekLabel] = useState('Week');
  const [isGenerating, setIsGenerating] = useState(false);

  const [editingFixtureId, setEditingFixtureId] = useState<string | null>(null);
  const [scoreP1, setScoreP1] = useState('');
  const [scoreP2, setScoreP2] = useState('');

  const selectedTournament = tournaments.find((t) => t.id === selectedTournamentId) || null;
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const sortedRounds = [...rounds].sort((a, b) => a.sequence_order - b.sequence_order);
  const latestRound = sortedRounds[sortedRounds.length - 1];
  const latestRoundFixtures = latestRound ? fixtures.filter((f) => f.round_id === latestRound.id) : [];

  const loadTournamentDetail = async (tournamentId: string) => {
    setLoadingDetail(true);
    const [{ data: roundData }, { data: entrantData }] = await Promise.all([
      supabase.from('pool_rounds').select('*').eq('tournament_id', tournamentId).order('sequence_order'),
      supabase.from('pool_tournament_players').select('player_id').eq('tournament_id', tournamentId),
    ]);
    const roundIds = ((roundData as PoolRound[]) || []).map((r) => r.id);
    const { data: fixtureData } = roundIds.length
      ? await supabase.from('pool_fixtures').select('*').in('round_id', roundIds)
      : { data: [] as PoolFixture[] };

    setRounds((roundData as PoolRound[]) || []);
    setFixtures((fixtureData as PoolFixture[]) || []);
    setEntrantIds(((entrantData as { player_id: string }[]) || []).map((e) => e.player_id));
    setLoadingDetail(false);
  };

  useEffect(() => {
    if (selectedTournamentId) loadTournamentDetail(selectedTournamentId);
    else {
      setRounds([]);
      setFixtures([]);
      setEntrantIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTournamentId]);

  const addPoolPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    const { data, error } = await supabase.from('pool_players').insert([{ name: newPlayerName.trim() }]).select().single();
    if (error) alert(error.message);
    else { setPlayers((prev) => [...prev, data]); setNewPlayerName(''); }
  };

  const deletePoolPlayer = async (playerId: string, name: string) => {
    if (!confirm(`Delete ${name} from the pool roster?`)) return;
    const { error } = await supabase.from('pool_players').delete().eq('id', playerId);
    if (error) alert(error.message);
    else setPlayers((prev) => prev.filter((p) => p.id !== playerId));
  };

  const createTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTournamentName.trim()) return;
    const { data, error } = await supabase
      .from('pool_tournaments')
      .insert([{ name: newTournamentName.trim(), format: newTournamentFormat, status: 'setup' }])
      .select()
      .single();
    if (error) alert(error.message);
    else {
      setTournaments((prev) => [data, ...prev]);
      setNewTournamentName('');
      setSelectedTournamentId(data.id);
    }
  };

  const deleteTournament = async (tournamentId: string, name: string) => {
    if (!confirm(`Delete tournament "${name}"? This removes all its rounds and fixtures too.`)) return;
    const { error } = await supabase.from('pool_tournaments').delete().eq('id', tournamentId);
    if (error) alert(error.message);
    else {
      setTournaments((prev) => prev.filter((t) => t.id !== tournamentId));
      if (selectedTournamentId === tournamentId) setSelectedTournamentId(null);
    }
  };

  const toggleEntrant = async (playerId: string) => {
    if (!selectedTournamentId) return;
    if (entrantIds.includes(playerId)) {
      const { error } = await supabase
        .from('pool_tournament_players')
        .delete()
        .eq('tournament_id', selectedTournamentId)
        .eq('player_id', playerId);
      if (error) alert(error.message);
      else setEntrantIds((prev) => prev.filter((id) => id !== playerId));
    } else {
      const { error } = await supabase
        .from('pool_tournament_players')
        .insert([{ tournament_id: selectedTournamentId, player_id: playerId }]);
      if (error) alert(error.message);
      else setEntrantIds((prev) => [...prev, playerId]);
    }
  };

  const markTournamentStatus = async (status: PoolTournament['status']) => {
    if (!selectedTournamentId) return;
    const { error } = await supabase.from('pool_tournaments').update({ status }).eq('id', selectedTournamentId);
    if (error) { alert(error.message); return; }
    setTournaments((prev) => prev.map((t) => (t.id === selectedTournamentId ? { ...t, status } : t)));
  };

  const generateLeagueFixtures = async () => {
    if (!selectedTournamentId) return;
    const gpp = parseInt(genGamesPerPlayer, 10);
    if (entrantIds.length < 2) { alert('Add at least 2 players to this tournament first.'); return; }
    if (isNaN(gpp) || gpp < 1) { alert('Enter a valid number of games per player.'); return; }

    setIsGenerating(true);
    try {
      const roundsPairs = generateRoundRobinRounds(entrantIds, gpp);
      if (roundsPairs.length === 0) { alert('Could not generate fixtures with those settings.'); return; }

      let nextSequence = rounds.length > 0 ? Math.max(...rounds.map((r) => r.sequence_order)) + 1 : 1;
      const newRounds: PoolRound[] = [];
      const newFixtures: PoolFixture[] = [];

      for (const pairs of roundsPairs) {
        const label = `${genWeekLabel.trim() || 'Week'} ${nextSequence}`;
        const { data: roundData, error: roundError } = await supabase
          .from('pool_rounds')
          .insert([{ tournament_id: selectedTournamentId, name: label, sequence_order: nextSequence }])
          .select()
          .single();
        if (roundError || !roundData) { alert(roundError?.message || 'Failed to create round.'); break; }
        newRounds.push(roundData);
        nextSequence += 1;
        if (pairs.length === 0) continue;

        const rows = pairs.map(([p1, p2]) => ({ round_id: roundData.id, player_1_id: p1, player_2_id: p2, completed: false }));
        const { data: fixtureData, error: fixtureError } = await supabase.from('pool_fixtures').insert(rows).select();
        if (fixtureError) { alert(fixtureError.message); break; }
        if (fixtureData) newFixtures.push(...fixtureData);
      }

      setRounds((prev) => [...prev, ...newRounds]);
      setFixtures((prev) => [...prev, ...newFixtures]);
      if (selectedTournament?.status === 'setup') await markTournamentStatus('active');
    } finally {
      setIsGenerating(false);
    }
  };

  const startKnockout = async () => {
    if (!selectedTournamentId) return;
    if (entrantIds.length < 2) { alert('Add at least 2 players to this tournament first.'); return; }
    if (rounds.length > 0) { alert('This bracket has already been started.'); return; }

    setIsGenerating(true);
    try {
      const { pairs, byePlayerId } = generateKnockoutPairings(entrantIds);
      const { data: roundData, error: roundError } = await supabase
        .from('pool_rounds')
        .insert([{ tournament_id: selectedTournamentId, name: roundNameForSize(entrantIds.length), sequence_order: 1 }])
        .select()
        .single();
      if (roundError || !roundData) { alert(roundError?.message || 'Failed to create round.'); return; }

      const rows: Partial<PoolFixture>[] = pairs.map(([p1, p2]) => ({ round_id: roundData.id, player_1_id: p1, player_2_id: p2, completed: false, is_bye: false }));
      if (byePlayerId) rows.push({ round_id: roundData.id, player_1_id: byePlayerId, player_2_id: null, completed: true, is_bye: true, player_1_score: 1, player_2_score: 0 });

      const { data: fixtureData, error: fixtureError } = await supabase.from('pool_fixtures').insert(rows).select();
      if (fixtureError) { alert(fixtureError.message); return; }

      setRounds((prev) => [...prev, roundData]);
      setFixtures((prev) => [...prev, ...((fixtureData as PoolFixture[]) || [])]);
      await markTournamentStatus('active');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateNextKnockoutRound = async () => {
    if (!selectedTournamentId || !latestRound) return;
    if (latestRoundFixtures.some((f) => !f.completed)) {
      alert('Enter results for every match in the current round first.');
      return;
    }
    const winners = latestRoundFixtures.map((f) => fixtureWinnerId(f)).filter((id): id is string => !!id);
    if (winners.length <= 1) {
      await markTournamentStatus('completed');
      alert('Tournament complete — champion decided!');
      return;
    }

    setIsGenerating(true);
    try {
      const { pairs, byePlayerId } = generateKnockoutPairings(winners);
      const nextSequence = Math.max(...rounds.map((r) => r.sequence_order)) + 1;
      const { data: roundData, error: roundError } = await supabase
        .from('pool_rounds')
        .insert([{ tournament_id: selectedTournamentId, name: roundNameForSize(winners.length), sequence_order: nextSequence }])
        .select()
        .single();
      if (roundError || !roundData) { alert(roundError?.message || 'Failed to create round.'); return; }

      const rows: Partial<PoolFixture>[] = pairs.map(([p1, p2]) => ({ round_id: roundData.id, player_1_id: p1, player_2_id: p2, completed: false, is_bye: false }));
      if (byePlayerId) rows.push({ round_id: roundData.id, player_1_id: byePlayerId, player_2_id: null, completed: true, is_bye: true, player_1_score: 1, player_2_score: 0 });

      const { data: fixtureData, error: fixtureError } = await supabase.from('pool_fixtures').insert(rows).select();
      if (fixtureError) { alert(fixtureError.message); return; }

      setRounds((prev) => [...prev, roundData]);
      setFixtures((prev) => [...prev, ...((fixtureData as PoolFixture[]) || [])]);
    } finally {
      setIsGenerating(false);
    }
  };

  const submitScore = async (fixtureId: string) => {
    const s1 = parseInt(scoreP1, 10);
    const s2 = parseInt(scoreP2, 10);
    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0 || s1 === s2) {
      alert('Enter valid scores — draws are not supported for knockout/league progression.');
      return;
    }
    const { error } = await supabase.from('pool_fixtures').update({ player_1_score: s1, player_2_score: s2, completed: true }).eq('id', fixtureId);
    if (error) alert(error.message);
    else {
      setFixtures((prev) => prev.map((f) => (f.id === fixtureId ? { ...f, player_1_score: s1, player_2_score: s2, completed: true } : f)));
      setEditingFixtureId(null); setScoreP1(''); setScoreP2('');
    }
  };

  const deleteFixture = async (fixtureId: string) => {
    if (!confirm('Delete this fixture?')) return;
    const { error } = await supabase.from('pool_fixtures').delete().eq('id', fixtureId);
    if (error) alert(error.message);
    else setFixtures((prev) => prev.filter((f) => f.id !== fixtureId));
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-charcoal-900 p-4 rounded-xl border border-sky-950">
        <h1 className="text-2xl font-black tracking-tight text-white">Pool — Admin Dashboard</h1>
        <p className="text-xs text-sky-400 font-medium">Manage the pool roster, tournaments, and fixtures</p>
      </div>

      {/* Pool Player Roster */}
      <div className="bg-charcoal-900 border border-sky-950 p-5 rounded-xl space-y-4">
        <h2 className="text-lg font-bold text-white border-b border-charcoal-800 pb-2">Pool Player Roster</h2>
        <form onSubmit={addPoolPlayer} className="flex gap-2">
          <input type="text" placeholder="Player Name" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)}
            className="flex-1 bg-charcoal-950 border border-sky-900/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500" />
          <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">Add</button>
        </form>
        {players.length > 0 && (
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {players.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm text-gray-300 px-3 py-1.5 bg-charcoal-950 rounded-lg">
                <span>{p.name}</span>
                <button onClick={() => deletePoolPlayer(p.id, p.name)} className="text-rose-500 hover:text-rose-400 text-xs font-bold ml-2 transition-colors">Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tournaments */}
      <div className="bg-charcoal-900 border border-sky-950 p-5 rounded-xl space-y-4">
        <h2 className="text-lg font-bold text-white border-b border-charcoal-800 pb-2">Tournaments</h2>
        <form onSubmit={createTournament} className="grid gap-2 sm:grid-cols-3">
          <input type="text" placeholder="Tournament name" value={newTournamentName} onChange={(e) => setNewTournamentName(e.target.value)}
            className="bg-charcoal-950 border border-sky-900/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500" />
          <select value={newTournamentFormat} onChange={(e) => setNewTournamentFormat(e.target.value as PoolFormat)}
            className="bg-charcoal-950 border border-sky-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500">
            <option value="league">League</option>
            <option value="knockout">Knockout</option>
          </select>
          <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">Create Tournament</button>
        </form>

        {tournaments.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {tournaments.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTournamentId(t.id)}
                className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  selectedTournamentId === t.id ? 'bg-sky-950/50 border-sky-600' : 'bg-charcoal-950 border-charcoal-800 hover:border-sky-800'
                }`}
              >
                <p className="text-sm font-bold text-white">{t.name}</p>
                <p className="text-xs text-gray-500 capitalize">{t.format} · {t.status}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Tournament Management */}
      {selectedTournament && (
        <div className="bg-charcoal-900 border border-sky-950 p-5 rounded-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-charcoal-800 pb-2">
            <h2 className="text-lg font-bold text-white">
              Managing: {selectedTournament.name} <span className="text-sky-400 text-sm capitalize">({selectedTournament.format})</span>
            </h2>
            <button onClick={() => deleteTournament(selectedTournament.id, selectedTournament.name)}
              className="text-xs font-bold text-rose-500 hover:text-rose-400">Delete Tournament</button>
          </div>

          {loadingDetail ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : (
            <>
              {/* Entrants */}
              <div>
                <p className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-2">
                  Entrants ({entrantIds.length}) {rounds.length > 0 && <span className="text-gray-600 normal-case">— locked once fixtures are generated</span>}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
                  {players.map((p) => (
                    <label key={p.id} className={`flex items-center gap-2 text-sm text-gray-300 px-2 py-1.5 bg-charcoal-950 rounded-lg select-none ${rounds.length > 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                      <input type="checkbox" checked={entrantIds.includes(p.id)} disabled={rounds.length > 0}
                        onChange={() => toggleEntrant(p.id)} className="accent-sky-600" />
                      <span className="truncate">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Generator */}
              {rounds.length === 0 && (
                selectedTournament.format === 'league' ? (
                  <div className="border border-sky-900/40 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-bold text-white">Generate League Fixtures</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs font-bold text-sky-400 uppercase tracking-widest mb-1.5">Games per Player</label>
                        <input type="number" min="1" value={genGamesPerPlayer} onChange={(e) => setGenGamesPerPlayer(e.target.value)}
                          className="w-full bg-charcoal-950 border border-sky-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-sky-400 uppercase tracking-widest mb-1.5">Week Label Prefix</label>
                        <input type="text" value={genWeekLabel} onChange={(e) => setGenWeekLabel(e.target.value)}
                          className="w-full bg-charcoal-950 border border-sky-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500" />
                      </div>
                      <div className="flex items-end">
                        <button onClick={generateLeagueFixtures} disabled={isGenerating}
                          className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-sky-900 disabled:text-sky-700 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">
                          {isGenerating ? 'Generating...' : 'Generate Fixtures'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border border-sky-900/40 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-bold text-white">Start Knockout Bracket</p>
                    <p className="text-xs text-gray-500">Randomly pairs up all entrants for Round 1. If there&apos;s an odd number, one player gets a bye.</p>
                    <button onClick={startKnockout} disabled={isGenerating}
                      className="bg-sky-600 hover:bg-sky-500 disabled:bg-sky-900 disabled:text-sky-700 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">
                      {isGenerating ? 'Generating...' : 'Generate Round 1'}
                    </button>
                  </div>
                )
              )}

              {/* Knockout: advance round */}
              {selectedTournament.format === 'knockout' && rounds.length > 0 && selectedTournament.status !== 'completed' && (
                <div className="border border-sky-900/40 rounded-xl p-4">
                  <button onClick={generateNextKnockoutRound} disabled={isGenerating}
                    className="bg-sky-600 hover:bg-sky-500 disabled:bg-sky-900 disabled:text-sky-700 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">
                    {isGenerating ? 'Generating...' : 'Generate Next Round'}
                  </button>
                  <p className="text-xs text-gray-500 mt-2">All matches in the current round must be completed first.</p>
                </div>
              )}

              {/* Fixtures Management */}
              {rounds.length > 0 && (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-sky-400 uppercase tracking-widest">Fixtures</p>
                  {sortedRounds.map((r) => {
                    const rFixtures = fixtures.filter((f) => f.round_id === r.id);
                    if (rFixtures.length === 0) return null;
                    return (
                      <div key={r.id}>
                        <p className="text-xs font-bold text-sky-500 uppercase tracking-widest mb-2">{r.name}</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {rFixtures.map((f) => {
                            const p1 = playerMap.get(f.player_1_id);
                            const p2 = f.player_2_id ? playerMap.get(f.player_2_id) : null;
                            const isEditing = editingFixtureId === f.id;
                            return (
                              <div key={f.id} className="bg-charcoal-950 border border-sky-900/30 rounded-lg p-3 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className={`font-bold truncate max-w-[90px] ${f.is_bye || (f.completed && f.player_1_score > f.player_2_score) ? 'text-sky-400' : 'text-gray-200'}`}>{p1?.name || '?'}</span>
                                  <span className="font-mono font-black text-white px-2">
                                    {f.is_bye ? 'BYE' : f.completed ? `${f.player_1_score}-${f.player_2_score}` : 'VS'}
                                  </span>
                                  <span className={`font-bold truncate max-w-[90px] text-right ${f.completed && f.player_2_score > f.player_1_score ? 'text-sky-400' : 'text-gray-200'}`}>{f.is_bye ? '—' : p2?.name || '?'}</span>
                                </div>
                                {!f.is_bye && (
                                  isEditing ? (
                                    <div className="space-y-2">
                                      <div className="flex gap-2 items-center justify-center">
                                        <input type="number" min="0" value={scoreP1} onChange={(e) => setScoreP1(e.target.value)} placeholder="P1"
                                          className="w-14 bg-charcoal-900 border border-sky-700 rounded px-2 py-1 text-sm text-white text-center focus:outline-none" />
                                        <span className="text-gray-500 text-xs">-</span>
                                        <input type="number" min="0" value={scoreP2} onChange={(e) => setScoreP2(e.target.value)} placeholder="P2"
                                          className="w-14 bg-charcoal-900 border border-sky-700 rounded px-2 py-1 text-sm text-white text-center focus:outline-none" />
                                      </div>
                                      <div className="flex gap-2">
                                        <button onClick={() => submitScore(f.id)} className="flex-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold py-1.5 rounded transition-colors">Save</button>
                                        <button onClick={() => { setEditingFixtureId(null); setScoreP1(''); setScoreP2(''); }} className="text-gray-500 hover:text-gray-300 text-xs px-2">Cancel</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-2 gap-1">
                                      <button onClick={() => { setEditingFixtureId(f.id); setScoreP1(f.completed ? String(f.player_1_score) : ''); setScoreP2(f.completed ? String(f.player_2_score) : ''); }}
                                        className={`text-xs font-bold py-1.5 rounded transition-colors ${f.completed ? 'bg-charcoal-800 text-gray-400 hover:bg-charcoal-700' : 'bg-sky-900/40 text-sky-400 hover:bg-sky-900/60'}`}>
                                        {f.completed ? 'Edit Score' : 'Enter Score'}
                                      </button>
                                      <button onClick={() => deleteFixture(f.id)} className="text-xs font-bold py-1.5 rounded transition-colors bg-rose-900/40 text-rose-400 hover:bg-rose-900/60">Delete</button>
                                    </div>
                                  )
                                )}
                              </div>
                            );
                          })}
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
