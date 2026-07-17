'use client';

import React, { useState } from 'react';
import { Player, Week, Fixture } from '@/types';
import { supabase } from '@/lib/supabase';
import { generateRoundRobinRounds } from '@/lib/fixtureGenerator';

interface AdminDashboardProps {
  initialPlayers: Player[];
  initialWeeks: Week[];
  initialFixtures: Fixture[];
}

export default function AdminDashboard({ initialPlayers, initialWeeks, initialFixtures }: AdminDashboardProps) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [weeks, setWeeks] = useState<Week[]>(initialWeeks);
  const [fixtures, setFixtures] = useState<Fixture[]>(initialFixtures);

  const [newPlayerName, setNewPlayerName] = useState('');
  const [newWeekName, setNewWeekName] = useState('');

  const [selectedWeek, setSelectedWeek] = useState('');
  const [p1Id, setP1Id] = useState('');
  const [p2Id, setP2Id] = useState('');

  const [editingFixtureId, setEditingFixtureId] = useState<string | null>(null);
  const [scoreP1, setScoreP1] = useState('');
  const [scoreP2, setScoreP2] = useState('');
  const [bestOf, setBestOf] = useState('5');
  const [isWalkover, setIsWalkover] = useState(false);

  const [editingPlayersId, setEditingPlayersId] = useState<string | null>(null);
  const [editP1Id, setEditP1Id] = useState('');
  const [editP2Id, setEditP2Id] = useState('');
  const [editWeekId, setEditWeekId] = useState('');

  const [genPlayerIds, setGenPlayerIds] = useState<string[]>([]);
  const [genGamesPerPlayer, setGenGamesPerPlayer] = useState('1');
  const [genWeekLabel, setGenWeekLabel] = useState('Week');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.replace('/login');
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    const { data, error } = await supabase
      .from('players')
      .insert([{ name: newPlayerName.trim() }])
      .select()
      .single();
    if (error) { alert(error.message); }
    else { setPlayers((prev) => [...prev, data]); setNewPlayerName(''); }
  };

  const deletePlayer = async (playerId: string, playerName: string) => {
    if (!confirm(`Delete ${playerName}? This will also delete all their fixtures.`)) return;
    const { error } = await supabase.from('players').delete().eq('id', playerId);
    if (error) { alert(error.message); }
    else {
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
      setFixtures((prev) => prev.filter((f) => f.player_1_id !== playerId && f.player_2_id !== playerId));
    }
  };

  const addWeek = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeekName.trim()) return;
    const order = weeks.length + 1;
    const { data, error } = await supabase
      .from('weeks')
      .insert([{ name: newWeekName.trim(), sequence_order: order }])
      .select()
      .single();
    if (error) { alert(error.message); }
    else { setWeeks((prev) => [...prev, data]); setNewWeekName(''); }
  };

  const toggleGenPlayer = (playerId: string) => {
    setGenPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const generateFixtures = async () => {
    const gpp = parseInt(genGamesPerPlayer, 10);
    if (genPlayerIds.length < 2) {
      alert('Select at least 2 players to generate fixtures for.');
      return;
    }
    if (isNaN(gpp) || gpp < 1) {
      alert('Enter a valid number of games per player (1 or more).');
      return;
    }

    setIsGenerating(true);
    try {
      const rounds = generateRoundRobinRounds(genPlayerIds, gpp);
      if (rounds.length === 0) {
        alert('Could not generate fixtures with those settings.');
        return;
      }

      let nextSequence = weeks.length > 0 ? Math.max(...weeks.map((w) => w.sequence_order)) + 1 : 1;
      const newWeeks: Week[] = [];
      const newFixtures: Fixture[] = [];

      for (const roundPairs of rounds) {
        const label = `${genWeekLabel.trim() || 'Week'} ${nextSequence}`;
        const { data: weekData, error: weekError } = await supabase
          .from('weeks')
          .insert([{ name: label, sequence_order: nextSequence }])
          .select()
          .single();
        if (weekError || !weekData) {
          alert(weekError?.message || 'Failed to create week.');
          break;
        }
        newWeeks.push(weekData);
        nextSequence += 1;

        if (roundPairs.length === 0) continue;

        const fixtureRows = roundPairs.map(([p1, p2]) => ({
          week_id: weekData.id,
          player_1_id: p1,
          player_2_id: p2,
          completed: false,
        }));

        const { data: fixtureData, error: fixtureError } = await supabase
          .from('fixtures')
          .insert(fixtureRows)
          .select();
        if (fixtureError) {
          alert(fixtureError.message);
          break;
        }
        if (fixtureData) newFixtures.push(...fixtureData);
      }

      setWeeks((prev) => [...prev, ...newWeeks]);
      setFixtures((prev) => [...prev, ...newFixtures]);
    } finally {
      setIsGenerating(false);
    }
  };

  const createFixture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWeek || !p1Id || !p2Id || p1Id === p2Id) {
      alert('Select a week and two different players.');
      return;
    }
    const { data, error } = await supabase
      .from('fixtures')
      .insert([{ week_id: selectedWeek, player_1_id: p1Id, player_2_id: p2Id, completed: false }])
      .select()
      .single();
    if (error) { alert(error.message); }
    else { setFixtures((prev) => [...prev, data]); setP1Id(''); setP2Id(''); }
  };

  const submitScore = async (fixtureId: string) => {
    const s1 = parseInt(scoreP1, 10);
    const s2 = parseInt(scoreP2, 10);
    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) {
      alert('Enter valid non-negative scores.');
      return;
    }
    const bo = parseInt(bestOf, 10);
    const safeBo = isNaN(bo) || bo < 1 ? 5 : bo;
    const { error } = await supabase
      .from('fixtures')
      .update({ player_1_score: s1, player_2_score: s2, completed: true, best_of: safeBo, is_walkover: isWalkover })
      .eq('id', fixtureId);
    if (error) { alert(error.message); }
    else {
      setFixtures((prev) => prev.map((f) =>
        f.id === fixtureId ? { ...f, player_1_score: s1, player_2_score: s2, completed: true, best_of: safeBo, is_walkover: isWalkover } : f
      ));
      setEditingFixtureId(null);
      setScoreP1('');
      setScoreP2('');
      setBestOf('5');
      setIsWalkover(false);
    }
  };

  const deleteFixture = async (fixtureId: string) => {
    if (!confirm('Delete this fixture? This cannot be undone.')) return;
    const { error } = await supabase.from('fixtures').delete().eq('id', fixtureId);
    if (error) { alert(error.message); }
    else { setFixtures((prev) => prev.filter((f) => f.id !== fixtureId)); }
  };

  const openEditPlayers = (f: Fixture) => {
    setEditingPlayersId(f.id);
    setEditP1Id(f.player_1_id);
    setEditP2Id(f.player_2_id);
    setEditWeekId(f.week_id);
  };

  const saveEditPlayers = async (fixtureId: string) => {
    if (!editP1Id || !editP2Id || editP1Id === editP2Id) {
      alert('Select two different players.');
      return;
    }
    const { error } = await supabase
      .from('fixtures')
      .update({ player_1_id: editP1Id, player_2_id: editP2Id, week_id: editWeekId })
      .eq('id', fixtureId);
    if (error) { alert(error.message); }
    else {
      setFixtures((prev) => prev.map((f) =>
        f.id === fixtureId ? { ...f, player_1_id: editP1Id, player_2_id: editP2Id, week_id: editWeekId } : f
      ));
      setEditingPlayersId(null);
    }
  };

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const sortedWeeks = [...weeks].sort((a, b) => a.sequence_order - b.sequence_order);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center bg-charcoal-900 p-4 rounded-xl border border-emerald-950">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Darts — League HQ Dashboard</h1>
          <p className="text-xs text-emerald-400 font-medium">Secured Administrative Terminal</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/pool/admin" className="px-4 py-2 bg-sky-950/60 border border-sky-800/50 hover:bg-sky-900/60 text-sky-300 text-xs font-bold rounded-lg transition-all">
            Pool Admin →
          </a>
          <button onClick={handleSignOut} className="px-4 py-2 bg-charcoal-950 hover:bg-charcoal-800 text-gray-300 text-xs font-bold rounded-lg transition-all">
            Sign Out
          </button>
        </div>
      </div>

      {/* Player & Week Management */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Players */}
        <div className="bg-charcoal-900 border border-emerald-950 p-5 rounded-xl space-y-4">
          <h2 className="text-lg font-bold text-white border-b border-charcoal-800 pb-2">Player Roster</h2>
          <form onSubmit={addPlayer} className="flex gap-2">
            <input type="text" placeholder="Player Name" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)}
              className="flex-1 bg-charcoal-950 border border-emerald-900/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500" />
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">Add</button>
          </form>
          {players.length > 0 && (
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {players.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm text-gray-300 px-3 py-1.5 bg-charcoal-950 rounded-lg">
                  <span>{p.name}</span>
                  <button onClick={() => deletePlayer(p.id, p.name)}
                    className="text-rose-500 hover:text-rose-400 text-xs font-bold ml-2 transition-colors">
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Weeks */}
        <div className="bg-charcoal-900 border border-emerald-950 p-5 rounded-xl space-y-4">
          <h2 className="text-lg font-bold text-white border-b border-charcoal-800 pb-2">Weeks / Stages</h2>
          <form onSubmit={addWeek} className="flex gap-2">
            <input type="text" placeholder="e.g., Week 1" value={newWeekName} onChange={(e) => setNewWeekName(e.target.value)}
              className="flex-1 bg-charcoal-950 border border-emerald-900/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500" />
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">Add</button>
          </form>
          {weeks.length > 0 && (
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {sortedWeeks.map((w) => (
                <li key={w.id} className="text-sm text-gray-300 px-3 py-1.5 bg-charcoal-950 rounded-lg flex justify-between">
                  <span>{w.name}</span>
                  <span className="text-emerald-600 text-xs">#{w.sequence_order}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Auto-Generate Fixtures */}
      <div className="bg-charcoal-900 border border-amber-900/40 p-5 rounded-xl space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white border-b border-charcoal-800 pb-2">Auto-Generate Fixtures</h2>
          <p className="text-xs text-gray-500 mt-2">
            Pick your players and how many games each should get, and this creates that many new
            weeks with random pairings — nobody plays the same opponent twice. Existing weeks and
            results are never touched.
          </p>
        </div>

        <div>
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Players ({genPlayerIds.length} selected)</p>
          {players.length === 0 ? (
            <p className="text-gray-500 text-sm">Add players first.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
              {players.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm text-gray-300 px-2 py-1.5 bg-charcoal-950 rounded-lg cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={genPlayerIds.includes(p.id)}
                    onChange={() => toggleGenPlayer(p.id)}
                    className="accent-amber-600"
                  />
                  <span className="truncate">{p.name}</span>
                </label>
              ))}
            </div>
          )}
          <div className="flex gap-2 mt-2">
            <button onClick={() => setGenPlayerIds(players.map((p) => p.id))}
              className="text-xs text-amber-500 hover:text-amber-400 font-semibold">Select All</button>
            <button onClick={() => setGenPlayerIds([])}
              className="text-xs text-gray-500 hover:text-gray-400 font-semibold">Clear</button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold text-amber-400 uppercase tracking-widest mb-1.5">Games per Player</label>
            <input type="number" min="1" value={genGamesPerPlayer} onChange={(e) => setGenGamesPerPlayer(e.target.value)}
              className="w-full bg-charcoal-950 border border-amber-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-amber-400 uppercase tracking-widest mb-1.5">Week Label Prefix</label>
            <input type="text" value={genWeekLabel} onChange={(e) => setGenWeekLabel(e.target.value)}
              className="w-full bg-charcoal-950 border border-amber-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
          </div>
          <div className="flex items-end">
            <button onClick={generateFixtures} disabled={isGenerating}
              className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-amber-900 disabled:text-amber-700 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">
              {isGenerating ? 'Generating...' : 'Generate Fixtures'}
            </button>
          </div>
        </div>
      </div>

      {/* Create Fixture */}
      <div className="bg-charcoal-900 border border-emerald-950 p-5 rounded-xl space-y-4">
        <h2 className="text-lg font-bold text-white border-b border-charcoal-800 pb-2">Schedule New Fixture</h2>
        <form onSubmit={createFixture} className="grid gap-3 sm:grid-cols-4">
          <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}
            className="bg-charcoal-950 border border-emerald-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
            <option value="">Select Week</option>
            {sortedWeeks.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select value={p1Id} onChange={(e) => setP1Id(e.target.value)}
            className="bg-charcoal-950 border border-emerald-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
            <option value="">Player 1</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={p2Id} onChange={(e) => setP2Id(e.target.value)}
            className="bg-charcoal-950 border border-emerald-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
            <option value="">Player 2</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">Create</button>
        </form>
      </div>

      {/* Fixtures Management */}
      <div className="bg-charcoal-900 border border-emerald-950 p-5 rounded-xl space-y-4">
        <h2 className="text-lg font-bold text-white border-b border-charcoal-800 pb-2">Fixtures Management</h2>
        {fixtures.length === 0 ? (
          <p className="text-gray-500 text-sm">No fixtures created yet.</p>
        ) : (
          <div className="space-y-4">
            {sortedWeeks.map((w) => {
              const wFixtures = fixtures.filter((f) => f.week_id === w.id);
              if (wFixtures.length === 0) return null;
              return (
                <div key={w.id}>
                  <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-2">{w.name}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {wFixtures.map((f) => {
                      const p1 = playerMap.get(f.player_1_id);
                      const p2 = playerMap.get(f.player_2_id);
                      const isEditingScore = editingFixtureId === f.id;
                      const isEditingPlayers = editingPlayersId === f.id;

                      return (
                        <div key={f.id} className="bg-charcoal-950 border border-emerald-900/30 rounded-lg p-3 space-y-2">
                          {isEditingPlayers ? (
                            <div className="space-y-2">
                              <select value={editWeekId} onChange={(e) => setEditWeekId(e.target.value)}
                                className="w-full bg-charcoal-900 border border-emerald-700 rounded px-2 py-1 text-xs text-white focus:outline-none">
                                {sortedWeeks.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                              </select>
                              <div className="flex gap-2">
                                <select value={editP1Id} onChange={(e) => setEditP1Id(e.target.value)}
                                  className="flex-1 bg-charcoal-900 border border-emerald-700 rounded px-2 py-1 text-xs text-white focus:outline-none">
                                  {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <span className="text-gray-500 text-xs self-center">vs</span>
                                <select value={editP2Id} onChange={(e) => setEditP2Id(e.target.value)}
                                  className="flex-1 bg-charcoal-900 border border-emerald-700 rounded px-2 py-1 text-xs text-white focus:outline-none">
                                  {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => saveEditPlayers(f.id)}
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-1.5 rounded transition-colors">Save</button>
                                <button onClick={() => setEditingPlayersId(null)}
                                  className="text-gray-500 hover:text-gray-300 text-xs px-2">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-sm">
                              <span className={`font-bold truncate max-w-[90px] ${f.completed && f.player_1_score > f.player_2_score ? 'text-amber-400' : 'text-gray-200'}`}>
                                {p1?.name || '?'}
                              </span>
                              <span className="font-mono font-black text-white px-2">
                                {f.completed ? `${f.player_1_score}-${f.player_2_score}` : 'VS'}
                              </span>
                              <span className={`font-bold truncate max-w-[90px] text-right ${f.completed && f.player_2_score > f.player_1_score ? 'text-amber-400' : 'text-gray-200'}`}>
                                {p2?.name || '?'}
                              </span>
                            </div>
                          )}

                          {!isEditingPlayers && (
                            isEditingScore ? (
                              <div className="space-y-2">
                                <div className="flex gap-2 items-center">
                                  <input type="number" min="0" value={scoreP1} onChange={(e) => setScoreP1(e.target.value)} placeholder="P1"
                                    className="w-14 bg-charcoal-900 border border-emerald-700 rounded px-2 py-1 text-sm text-white text-center focus:outline-none" />
                                  <span className="text-gray-500 text-xs">-</span>
                                  <input type="number" min="0" value={scoreP2} onChange={(e) => setScoreP2(e.target.value)} placeholder="P2"
                                    className="w-14 bg-charcoal-900 border border-emerald-700 rounded px-2 py-1 text-sm text-white text-center focus:outline-none" />
                                  <label className="text-[10px] text-gray-500 ml-1">Best of</label>
                                  <input type="number" min="1" value={bestOf} onChange={(e) => setBestOf(e.target.value)} placeholder="5"
                                    className="w-12 bg-charcoal-900 border border-amber-700/60 rounded px-2 py-1 text-sm text-white text-center focus:outline-none" />
                                </div>
                                <label className="flex items-center gap-1.5 text-[11px] text-gray-400 select-none cursor-pointer">
                                  <input type="checkbox" checked={isWalkover} onChange={(e) => setIsWalkover(e.target.checked)}
                                    className="accent-amber-600" />
                                  Walkover (affects tiebreaker only, not visible publicly)
                                </label>
                                <div className="flex gap-2">
                                  <button onClick={() => submitScore(f.id)}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-1.5 rounded transition-colors">Save</button>
                                  <button onClick={() => { setEditingFixtureId(null); setScoreP1(''); setScoreP2(''); setBestOf('5'); setIsWalkover(false); }}
                                    className="text-gray-500 hover:text-gray-300 text-xs px-2">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <p className="text-[10px] text-gray-500 text-center">
                                  Best of {f.best_of ?? 5}
                                  {f.is_walkover && <span className="ml-1.5 text-amber-500 font-bold">· WO</span>}
                                </p>
                                <div className="grid grid-cols-3 gap-1">
                                  <button onClick={() => { setEditingFixtureId(f.id); setScoreP1(f.completed ? String(f.player_1_score) : ''); setScoreP2(f.completed ? String(f.player_2_score) : ''); setBestOf(String(f.best_of ?? 5)); setIsWalkover(!!f.is_walkover); }}
                                    className={`text-xs font-bold py-1.5 rounded transition-colors ${f.completed ? 'bg-charcoal-800 text-gray-400 hover:bg-charcoal-700' : 'bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60'}`}>
                                    {f.completed ? 'Edit Score' : 'Enter Score'}
                                  </button>
                                  <button onClick={() => openEditPlayers(f)}
                                    className="text-xs font-bold py-1.5 rounded transition-colors bg-amber-900/40 text-amber-400 hover:bg-amber-900/60">
                                    Edit Fixture
                                  </button>
                                  <button onClick={() => deleteFixture(f.id)}
                                    className="text-xs font-bold py-1.5 rounded transition-colors bg-rose-900/40 text-rose-400 hover:bg-rose-900/60">
                                    Delete
                                  </button>
                                </div>
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
      </div>
    </div>
  );
}
