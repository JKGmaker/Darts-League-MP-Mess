'use client';

import React, { useState } from 'react';
import { Player, Week, Fixture } from '@/types';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface AdminDashboardProps {
  initialPlayers: Player[];
  initialWeeks: Week[];
  initialFixtures: Fixture[];
}

export default function AdminDashboard({ initialPlayers, initialWeeks, initialFixtures }: AdminDashboardProps) {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [weeks, setWeeks] = useState<Week[]>(initialWeeks);
  const [fixtures, setFixtures] = useState<Fixture[]>(initialFixtures);

  const [newPlayerName, setNewPlayerName] = useState('');
  const [newWeekName, setNewWeekName] = useState('');

  const [selectedWeek, setSelectedWeek] = useState('');
  const [p1Id, setP1Id] = useState('');
  const [p2Id, setP2Id] = useState('');

  // Score update state
  const [editingFixtureId, setEditingFixtureId] = useState<string | null>(null);
  const [scoreP1, setScoreP1] = useState('');
  const [scoreP2, setScoreP2] = useState('');

  React.useEffect(() => { setPlayers(initialPlayers); }, [initialPlayers]);
  React.useEffect(() => { setWeeks(initialWeeks); }, [initialWeeks]);
  React.useEffect(() => { setFixtures(initialFixtures); }, [initialFixtures]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    const { data, error } = await supabase
      .from('players')
      .insert([{ name: newPlayerName.trim() }])
      .select()
      .single();
    if (error) {
      alert(error.message);
    } else {
      setPlayers((prev) => [...prev, data]);
      setNewPlayerName('');
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
    if (error) {
      alert(error.message);
    } else {
      setWeeks((prev) => [...prev, data]);
      setNewWeekName('');
    }
  };

  const createFixture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWeek || !p1Id || !p2Id || p1Id === p2Id) {
      alert('Select distinct competing entities.');
      return;
    }
    const { data, error } = await supabase
      .from('fixtures')
      .insert([{ week_id: selectedWeek, player_1_id: p1Id, player_2_id: p2Id, completed: false }])
      .select()
      .single();
    if (error) {
      alert(error.message);
    } else {
      setFixtures((prev) => [...prev, data]);
      setP1Id('');
      setP2Id('');
    }
  };

  const submitScore = async (fixtureId: string) => {
    const s1 = parseInt(scoreP1, 10);
    const s2 = parseInt(scoreP2, 10);
    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) {
      alert('Enter valid non-negative scores.');
      return;
    }
    const { error } = await supabase
      .from('fixtures')
      .update({ player_1_score: s1, player_2_score: s2, completed: true })
      .eq('id', fixtureId);
    if (error) {
      alert(error.message);
    } else {
      setFixtures((prev) =>
        prev.map((f) =>
          f.id === fixtureId
            ? { ...f, player_1_score: s1, player_2_score: s2, completed: true }
            : f
        )
      );
      setEditingFixtureId(null);
      setScoreP1('');
      setScoreP2('');
    }
  };

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const sortedWeeks = [...weeks].sort((a, b) => a.sequence_order - b.sequence_order);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center bg-charcoal-900 p-4 rounded-xl border border-emerald-950">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">League HQ Dashboard</h1>
          <p className="text-xs text-emerald-400 font-medium">Secured Administrative Terminal</p>
        </div>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 bg-charcoal-950 hover:bg-charcoal-800 text-gray-300 text-xs font-bold rounded-lg transition-all"
        >
          Disconnect Auth
        </button>
      </div>

      {/* Player & Week Management */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Add Player */}
        <div className="bg-charcoal-900 border border-emerald-950 p-5 rounded-xl space-y-4">
          <h2 className="text-lg font-bold text-white border-b border-charcoal-800 pb-2">Player Roster Operations</h2>
          <form onSubmit={addPlayer} className="flex gap-2">
            <input
              type="text"
              placeholder="Player Name"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              className="flex-1 bg-charcoal-950 border border-emerald-900/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
            />
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">
              Add Player
            </button>
          </form>
          {players.length > 0 && (
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {players.map((p) => (
                <li key={p.id} className="text-sm text-gray-300 px-3 py-1.5 bg-charcoal-950 rounded-lg">
                  {p.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add Week */}
        <div className="bg-charcoal-900 border border-emerald-950 p-5 rounded-xl space-y-4">
          <h2 className="text-lg font-bold text-white border-b border-charcoal-800 pb-2">League Stages &amp; Weeks</h2>
          <form onSubmit={addWeek} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g., Week 1"
              value={newWeekName}
              onChange={(e) => setNewWeekName(e.target.value)}
              className="flex-1 bg-charcoal-950 border border-emerald-900/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
            />
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">
              Add Stage
            </button>
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

      {/* Create Fixture */}
      <div className="bg-charcoal-900 border border-emerald-950 p-5 rounded-xl space-y-4">
        <h2 className="text-lg font-bold text-white border-b border-charcoal-800 pb-2">Schedule New Fixture</h2>
        <form onSubmit={createFixture} className="grid gap-3 sm:grid-cols-4">
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="bg-charcoal-950 border border-emerald-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">Select Week</option>
            {sortedWeeks.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <select
            value={p1Id}
            onChange={(e) => setP1Id(e.target.value)}
            className="bg-charcoal-950 border border-emerald-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">Player 1</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={p2Id}
            onChange={(e) => setP2Id(e.target.value)}
            className="bg-charcoal-950 border border-emerald-900/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">Player 2</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">
            Create Fixture
          </button>
        </form>
      </div>

      {/* Score Entry */}
      <div className="bg-charcoal-900 border border-emerald-950 p-5 rounded-xl space-y-4">
        <h2 className="text-lg font-bold text-white border-b border-charcoal-800 pb-2">Score Entry Terminal</h2>
        {fixtures.length === 0 ? (
          <p className="text-gray-500 text-sm">No fixtures created yet.</p>
        ) : (
          <div className="space-y-3">
            {sortedWeeks.map((w) => {
              const wFixtures = fixtures.filter((f) => f.week_id === w.id);
              if (wFixtures.length === 0) return null;
              return (
                <div key={w.id}>
                  <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-2">{w.name}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {wFixtures.map((f) => {
                      const p1 = playerMap.get(f.player_1_id);
                      const p2 = playerMap.get(f.player_2_id);
                      const isEditing = editingFixtureId === f.id;
                      return (
                        <div key={f.id} className="bg-charcoal-950 border border-emerald-900/30 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className={`font-bold truncate max-w-[100px] ${f.completed && f.player_1_score > f.player_2_score ? 'text-amber-400' : 'text-gray-200'}`}>
                              {p1?.name || '?'}
                            </span>
                            <span className="font-mono font-black text-white px-2">
                              {f.completed ? `${f.player_1_score}-${f.player_2_score}` : 'VS'}
                            </span>
                            <span className={`font-bold truncate max-w-[100px] text-right ${f.completed && f.player_2_score > f.player_1_score ? 'text-amber-400' : 'text-gray-200'}`}>
                              {p2?.name || '?'}
                            </span>
                          </div>

                          {isEditing ? (
                            <div className="flex gap-2 items-center">
                              <input
                                type="number"
                                min="0"
                                value={scoreP1}
                                onChange={(e) => setScoreP1(e.target.value)}
                                placeholder="P1"
                                className="w-14 bg-charcoal-900 border border-emerald-700 rounded px-2 py-1 text-sm text-white text-center focus:outline-none"
                              />
                              <span className="text-gray-500 text-xs">-</span>
                              <input
                                type="number"
                                min="0"
                                value={scoreP2}
                                onChange={(e) => setScoreP2(e.target.value)}
                                placeholder="P2"
                                className="w-14 bg-charcoal-900 border border-emerald-700 rounded px-2 py-1 text-sm text-white text-center focus:outline-none"
                              />
                              <button
                                onClick={() => submitScore(f.id)}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-1 rounded transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => { setEditingFixtureId(null); setScoreP1(''); setScoreP2(''); }}
                                className="text-gray-500 hover:text-gray-300 text-xs px-1"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingFixtureId(f.id);
                                setScoreP1(f.completed ? String(f.player_1_score) : '');
                                setScoreP2(f.completed ? String(f.player_2_score) : '');
                              }}
                              className={`w-full text-xs font-bold py-1.5 rounded transition-colors ${
                                f.completed
                                  ? 'bg-charcoal-800 text-gray-400 hover:bg-charcoal-700'
                                  : 'bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60'
                              }`}
                            >
                              {f.completed ? 'Edit Score' : 'Enter Score'}
                            </button>
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
