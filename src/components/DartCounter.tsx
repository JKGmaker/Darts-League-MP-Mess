'use client';

import React, { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Player, Fixture, Leg, Visit } from '@/types';

interface DartCounterProps {
  fixture: Fixture;
  player1: Player;
  player2: Player;
  initialLegs: Leg[];
  initialVisits: Visit[];
}

interface LegState {
  p1Remaining: number;
  p2Remaining: number;
  p1Visits: Visit[];
  p2Visits: Visit[];
  currentTurn: 'p1' | 'p2';
  legId: string | null;
  isComplete: boolean;
  winnerId: string | null;
}

const STARTING_SCORE = 501;

function calcAverage(visits: Visit[]): string {
  if (visits.length === 0) return '0.00';
  const totalScore = visits.reduce((s, v) => s + v.score, 0);
  const totalDarts = visits.reduce((s, v) => s + v.darts_used, 0);
  if (totalDarts === 0) return '0.00';
  return ((totalScore / totalDarts) * 3).toFixed(2);
}

function calcCheckoutPct(visits: Visit[]): string {
  const attempts = visits.filter((v) => v.remaining_before <= 170 && v.score > 0).length;
  const hits = visits.filter((v) => v.is_checkout).length;
  if (attempts === 0) return '0%';
  return `${Math.round((hits / attempts) * 100)}%`;
}

function countLegsWon(legs: Leg[], playerId: string): number {
  return legs.filter((l) => l.winner_id === playerId).length;
}

export default function DartCounter({
  fixture,
  player1,
  player2,
  initialLegs,
  initialVisits,
}: DartCounterProps) {
  const [legs, setLegs] = useState<Leg[]>(initialLegs);
  const [allVisits, setAllVisits] = useState<Visit[]>(initialVisits);
  const [inputValue, setInputValue] = useState('');
  const [dartsUsed, setDartsUsed] = useState<1 | 2 | 3>(3);
  const [isCheckout, setIsCheckout] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchComplete, setMatchComplete] = useState(false);
  const [matchWinnerId, setMatchWinnerId] = useState<string | null>(null);

  // Derive current leg state from legs + visits
  const currentLeg = legs.find((l) => !l.completed_at) || null;
  const currentLegVisits = allVisits.filter((v) => v.leg_id === currentLeg?.id);

  const p1LegVisits = currentLegVisits.filter((v) => v.player_id === player1.id);
  const p2LegVisits = currentLegVisits.filter((v) => v.player_id === player2.id);

  const p1Remaining =
    STARTING_SCORE - p1LegVisits.reduce((s, v) => s + v.score, 0);
  const p2Remaining =
    STARTING_SCORE - p2LegVisits.reduce((s, v) => s + v.score, 0);

  // Turn order: p1 goes first each leg; alternate by visit count
  const p1TurnCount = p1LegVisits.length;
  const p2TurnCount = p2LegVisits.length;
  const currentTurn: 'p1' | 'p2' =
    p1TurnCount <= p2TurnCount ? 'p1' : 'p2';

  const activePlayerId = currentTurn === 'p1' ? player1.id : player2.id;
  const activeRemaining = currentTurn === 'p1' ? p1Remaining : p2Remaining;

  const p1LegsWon = countLegsWon(legs, player1.id);
  const p2LegsWon = countLegsWon(legs, player2.id);

  // All visits for career stats this session
  const p1AllVisits = allVisits.filter((v) => v.player_id === player1.id);
  const p2AllVisits = allVisits.filter((v) => v.player_id === player2.id);

  const numpadPress = (val: string) => {
    if (inputValue.length >= 3) return;
    setInputValue((prev) => prev + val);
  };

  const clearInput = () => {
    setInputValue('');
    setIsCheckout(false);
    setDartsUsed(3);
  };

  const startNewLeg = useCallback(async () => {
    const legNumber = legs.length + 1;
    const { data, error: legError } = await supabase
      .from('legs')
      .insert({ fixture_id: fixture.id, leg_number: legNumber })
      .select()
      .single();

    if (legError || !data) {
      setError('Failed to start new leg. Please try again.');
      return null;
    }
    setLegs((prev) => [...prev, data]);
    return data;
  }, [fixture.id, legs.length]);

  const submitScore = useCallback(async () => {
    const score = parseInt(inputValue, 10);
    if (isNaN(score) || score < 0 || score > 180) {
      setError('Score must be between 0 and 180.');
      return;
    }

    // Bust check: can't finish on 1, and can't go below 0
    if (activeRemaining - score < 0 || activeRemaining - score === 1) {
      setError('Bust! Score would leave 1 or go below 0.');
      clearInput();
      return;
    }

    setError(null);
    setSaving(true);

    let activeLeg = currentLeg;

    // Start first leg automatically if none exists
    if (!activeLeg) {
      activeLeg = await startNewLeg();
      if (!activeLeg) {
        setSaving(false);
        return;
      }
    }

    const isWinningVisit = activeRemaining - score === 0;
    const visitPayload = {
      leg_id: activeLeg.id,
      player_id: activePlayerId,
      score,
      darts_used: isWinningVisit ? dartsUsed : 3,
      is_checkout: isWinningVisit ? isCheckout || true : false,
      remaining_before: activeRemaining,
    };

    const { data: visitData, error: visitError } = await supabase
      .from('visits')
      .insert(visitPayload)
      .select()
      .single();

    if (visitError || !visitData) {
      setError('Failed to save score. Please try again.');
      setSaving(false);
      return;
    }

    setAllVisits((prev) => [...prev, visitData]);

    // Leg won
    if (isWinningVisit) {
      const newP1Legs = p1LegsWon + (activePlayerId === player1.id ? 1 : 0);
      const newP2Legs = p2LegsWon + (activePlayerId === player2.id ? 1 : 0);

      // Mark leg complete
      await supabase
        .from('legs')
        .update({ winner_id: activePlayerId, completed_at: new Date().toISOString() })
        .eq('id', activeLeg.id);

      setLegs((prev) =>
        prev.map((l) =>
          l.id === activeLeg!.id
            ? { ...l, winner_id: activePlayerId, completed_at: new Date().toISOString() }
            : l
        )
      );

      // Match won (first to 3)
      if (newP1Legs >= 3 || newP2Legs >= 3) {
        const winnerId = newP1Legs >= 3 ? player1.id : player2.id;
        const p1FinalScore = newP1Legs >= 3 ? newP1Legs : newP1Legs;
        const p2FinalScore = newP2Legs >= 3 ? newP2Legs : newP2Legs;

        await supabase
          .from('fixtures')
          .update({
            player_1_score: newP1Legs,
            player_2_score: newP2Legs,
            completed: true,
          })
          .eq('id', fixture.id);

        setMatchComplete(true);
        setMatchWinnerId(winnerId);
      }
    }

    clearInput();
    setSaving(false);
  }, [
    inputValue,
    activeRemaining,
    activePlayerId,
    currentLeg,
    dartsUsed,
    isCheckout,
    p1LegsWon,
    p2LegsWon,
    player1.id,
    player2.id,
    fixture.id,
    startNewLeg,
  ]);

  if (matchComplete) {
    const winner = matchWinnerId === player1.id ? player1 : player2;
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center px-4">
        <div className="text-center space-y-6">
          <div className="text-6xl">🏆</div>
          <h1 className="text-4xl font-black text-amber-400">{winner.name}</h1>
          <p className="text-white text-xl font-bold">
            Wins {p1LegsWon} – {p2LegsWon}
          </p>
          <p className="text-gray-400 text-sm">Match complete — results saved.</p>
          <div className="flex gap-3 justify-center pt-4">
            <a
              href="/"
              className="px-6 py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all"
            >
              ← Back to League
            </a>
            <a
              href="/stats"
              className="px-6 py-3 bg-charcoal-800 hover:bg-charcoal-700 text-gray-200 font-bold rounded-xl border border-emerald-900/40 transition-all"
            >
              📊 View Stats
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal-950 flex flex-col">
      {/* Header */}
      <div className="bg-charcoal-900 border-b border-emerald-900/30 px-4 py-3 flex items-center justify-between">
        <a href="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ← Back
        </a>
        <span className="text-white font-black text-sm tracking-wider">🎯 SCORER</span>
        <a href="/stats" className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold transition-colors">
          Stats →
        </a>
      </div>

      {/* Leg score tracker */}
      <div className="bg-charcoal-900 border-b border-emerald-950/40 px-4 py-3">
        <div className="flex items-center justify-center gap-3">
          {/* Leg dots */}
          {[...Array(5)].map((_, i) => {
            const legDone = legs[i];
            let color = 'bg-charcoal-800 border border-charcoal-700';
            if (legDone?.winner_id === player1.id) color = 'bg-emerald-600';
            else if (legDone?.winner_id === player2.id) color = 'bg-amber-500';
            else if (legDone && !legDone.winner_id) color = 'bg-charcoal-700 border border-emerald-900';
            return <div key={i} className={`w-4 h-4 rounded-full ${color}`} />;
          })}
        </div>
        <div className="flex items-center justify-between mt-2 px-2">
          <span className="text-emerald-400 font-black text-lg">{p1LegsWon}</span>
          <span className="text-gray-600 text-xs uppercase tracking-widest">Legs</span>
          <span className="text-amber-400 font-black text-lg">{p2LegsWon}</span>
        </div>
      </div>

      {/* Player scoreboards */}
      <div className="grid grid-cols-2 gap-0 border-b border-emerald-950/40">
        {/* Player 1 */}
        <div
          className={`p-4 text-center border-r border-emerald-950/40 transition-all duration-300 ${
            currentTurn === 'p1' ? 'bg-emerald-950/30' : 'bg-charcoal-950 opacity-60'
          }`}
        >
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest truncate mb-1">
            {player1.name}
          </p>
          {currentTurn === 'p1' && (
            <div className="w-2 h-2 bg-emerald-400 rounded-full mx-auto mb-2 animate-pulse" />
          )}
          <p className="text-5xl font-black text-white tabular-nums">{p1Remaining}</p>
          <div className="mt-3 space-y-1 text-xs text-gray-500">
            <p>Avg: <span className="text-gray-300 font-semibold">{calcAverage(p1LegVisits)}</span></p>
            <p>Darts: <span className="text-gray-300 font-semibold">{p1LegVisits.reduce((s, v) => s + v.darts_used, 0)}</span></p>
            <p>Checkout: <span className="text-gray-300 font-semibold">{calcCheckoutPct(p1AllVisits)}</span></p>
          </div>
        </div>

        {/* Player 2 */}
        <div
          className={`p-4 text-center transition-all duration-300 ${
            currentTurn === 'p2' ? 'bg-amber-950/20' : 'bg-charcoal-950 opacity-60'
          }`}
        >
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest truncate mb-1">
            {player2.name}
          </p>
          {currentTurn === 'p2' && (
            <div className="w-2 h-2 bg-amber-400 rounded-full mx-auto mb-2 animate-pulse" />
          )}
          <p className="text-5xl font-black text-white tabular-nums">{p2Remaining}</p>
          <div className="mt-3 space-y-1 text-xs text-gray-500">
            <p>Avg: <span className="text-gray-300 font-semibold">{calcAverage(p2LegVisits)}</span></p>
            <p>Darts: <span className="text-gray-300 font-semibold">{p2LegVisits.reduce((s, v) => s + v.darts_used, 0)}</span></p>
            <p>Checkout: <span className="text-gray-300 font-semibold">{calcCheckoutPct(p2AllVisits)}</span></p>
          </div>
        </div>
      </div>

      {/* Input area */}
      <div className="flex-1 flex flex-col justify-end px-4 pb-6 pt-4 space-y-4">

        {/* Active player label */}
        <div className="text-center">
          <span
            className={`text-sm font-bold uppercase tracking-widest ${
              currentTurn === 'p1' ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {currentTurn === 'p1' ? player1.name : player2.name}&apos;s turn
          </span>
        </div>

        {/* Score display */}
        <div className="bg-charcoal-900 border border-emerald-900/30 rounded-xl px-6 py-4 text-center">
          <p className="text-4xl font-black text-white tabular-nums tracking-wider">
            {inputValue || '—'}
          </p>
          {error && (
            <p className="text-rose-400 text-xs mt-2 font-medium">{error}</p>
          )}
        </div>

        {/* Darts used (shown when score could be a checkout) */}
        {activeRemaining <= 180 && inputValue && parseInt(inputValue) === activeRemaining && (
          <div className="flex items-center justify-center gap-3">
            <span className="text-gray-500 text-xs uppercase tracking-wider">Darts used:</span>
            {([1, 2, 3] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDartsUsed(d)}
                className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                  dartsUsed === d
                    ? 'bg-emerald-600 text-white'
                    : 'bg-charcoal-800 text-gray-400 border border-charcoal-700'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, i) => {
            if (key === '') return <div key={i} />;
            return (
              <button
                key={i}
                onClick={() => {
                  if (key === '⌫') {
                    setInputValue((prev) => prev.slice(0, -1));
                  } else {
                    numpadPress(key);
                  }
                }}
                className="bg-charcoal-800 hover:bg-charcoal-700 active:bg-charcoal-600 border border-charcoal-700 text-white font-bold text-xl py-4 rounded-xl transition-all select-none"
              >
                {key}
              </button>
            );
          })}
        </div>

        {/* Submit */}
        <button
          onClick={submitScore}
          disabled={saving || !inputValue}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-charcoal-800 disabled:text-gray-600 text-white font-black text-lg rounded-xl transition-all tracking-wide"
        >
          {saving ? 'Saving...' : '✓ Submit Score'}
        </button>
      </div>
    </div>
  );
}
