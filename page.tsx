'use client';

import React, { useState, useCallback } from 'react';
import { Player } from '@/types';

interface DartScorerProps {
  players: Player[];
  onClose: () => void;
}

type GamePhase = 'setup' | 'bull' | 'playing' | 'leg_complete' | 'match_complete';

const STARTING_SCORES = [301, 501, 701] as const;
type StartingScore = typeof STARTING_SCORES[number];

interface LegResult {
  legNumber: number;
  winnerId: string;
  starterIdx: number; // 0 or 1 — who threw first
}

export default function DartScorer({ players, onClose }: DartScorerProps) {
  // --- Setup state ---
  const [p1Id, setP1Id] = useState<string>('');
  const [p2Id, setP2Id] = useState<string>('');
  const [totalLegs, setTotalLegs] = useState<number>(5);
  const [startingScore, setStartingScore] = useState<StartingScore>(501);

  // --- Game state ---
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [bullWinnerIdx, setBullWinnerIdx] = useState<0 | 1 | null>(null); // who threw closest to bull
  const [legResults, setLegResults] = useState<LegResult[]>([]);
  const [currentLegNum, setCurrentLegNum] = useState(1);
  const [currentStarterIdx, setCurrentStarterIdx] = useState<0 | 1>(0); // who throws first this leg
  const [currentTurnIdx, setCurrentTurnIdx] = useState<0 | 1>(0); // whose turn right now
  const [scores, setScores] = useState<[number, number]>([501, 501]);
  const [inputValue, setInputValue] = useState('');
  const [dartsUsed, setDartsUsed] = useState<1 | 2 | 3>(3);
  const [error, setError] = useState<string | null>(null);
  const [lastLegWinnerIdx, setLastLegWinnerIdx] = useState<0 | 1 | null>(null);

  const player1 = players.find(p => p.id === p1Id) || null;
  const player2 = players.find(p => p.id === p2Id) || null;

  const p1LegsWon = legResults.filter(l => l.winnerId === p1Id).length;
  const p2LegsWon = legResults.filter(l => l.winnerId === p2Id).length;
  const legsPlayed = legResults.length;

  // --- Setup handlers ---
  const canStart = p1Id && p2Id && p1Id !== p2Id;

  const handleStartSetup = () => {
    setScores([startingScore, startingScore]);
    setPhase('bull');
  };

  // --- Bull throw ---
  const handleBullWinner = (idx: 0 | 1) => {
    setBullWinnerIdx(idx);
    setCurrentStarterIdx(idx);
    setCurrentTurnIdx(idx);
    setPhase('playing');
  };

  // --- Numpad ---
  const numpadPress = (val: string) => {
    if (inputValue.length >= 3) return;
    setInputValue(prev => prev + val);
  };

  const clearInput = () => {
    setInputValue('');
    setDartsUsed(3);
    setError(null);
  };

  const activeScore = scores[currentTurnIdx];
  const parsedInput = parseInt(inputValue, 10);
  const wouldFinish = !isNaN(parsedInput) && activeScore - parsedInput === 0;

  // --- Submit score ---
  const submitScore = useCallback(() => {
    const score = parseInt(inputValue, 10);
    if (isNaN(score) || score < 0 || score > 180) {
      setError('Score must be 0–180.');
      return;
    }
    const remaining = activeScore - score;
    if (remaining < 0 || remaining === 1) {
      setError('Bust! Can\'t leave 1 or go below 0.');
      clearInput();
      return;
    }
    setError(null);

    const newScores: [number, number] = [...scores] as [number, number];
    newScores[currentTurnIdx] = remaining;

    if (remaining === 0) {
      // Leg won
      const winnerIdx = currentTurnIdx;
      const winnerId = winnerIdx === 0 ? p1Id : p2Id;
      const newLegResults = [...legResults, { legNumber: currentLegNum, winnerId, starterIdx: currentStarterIdx }];
      setLegResults(newLegResults);
      setLastLegWinnerIdx(winnerIdx);

      const newP1Legs = newLegResults.filter(l => l.winnerId === p1Id).length;
      const newP2Legs = newLegResults.filter(l => l.winnerId === p2Id).length;

      if (newLegResults.length >= totalLegs) {
        setPhase('match_complete');
      } else {
        setPhase('leg_complete');
      }
      clearInput();
      return;
    }

    // Switch turn: if current starter has had their turn, next player goes; strictly alternate
    // Determine next turn: simply flip
    const nextTurnIdx: 0 | 1 = currentTurnIdx === 0 ? 1 : 0;

    setScores(newScores);
    setCurrentTurnIdx(nextTurnIdx);
    clearInput();
  }, [inputValue, activeScore, scores, currentTurnIdx, p1Id, p2Id, legResults, currentLegNum, currentStarterIdx, totalLegs]);

  // --- Start next leg ---
  const startNextLeg = () => {
    const nextLegNum = currentLegNum + 1;
    // Alternate starter: opposite of who started this leg
    const nextStarterIdx: 0 | 1 = currentStarterIdx === 0 ? 1 : 0;
    setCurrentLegNum(nextLegNum);
    setCurrentStarterIdx(nextStarterIdx);
    setCurrentTurnIdx(nextStarterIdx);
    setScores([startingScore, startingScore]);
    setLastLegWinnerIdx(null);
    setPhase('playing');
    clearInput();
  };

  // --- Reset everything ---
  const resetAll = () => {
    setP1Id('');
    setP2Id('');
    setTotalLegs(5);
    setStartingScore(501);
    setPhase('setup');
    setBullWinnerIdx(null);
    setLegResults([]);
    setCurrentLegNum(1);
    setCurrentStarterIdx(0);
    setCurrentTurnIdx(0);
    setScores([501, 501]);
    setLastLegWinnerIdx(null);
    clearInput();
  };

  // ============================================================
  // PHASE: SETUP
  // ============================================================
  if (phase === 'setup') {
    return (
      <div className="fixed inset-0 z-50 bg-charcoal-950 flex flex-col">
        {/* Header */}
        <div className="bg-charcoal-900 border-b border-emerald-900/30 px-4 py-3 flex items-center justify-between">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ✕ Cancel
          </button>
          <span className="text-white font-black text-sm tracking-wider">🎯 NEW GAME</span>
          <div className="w-16" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {/* Player 1 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Player 1</label>
            <select
              value={p1Id}
              onChange={e => setP1Id(e.target.value)}
              className="w-full bg-charcoal-900 border border-emerald-900/40 text-white rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-emerald-600 appearance-none"
            >
              <option value="">— Select player —</option>
              {players.map(p => (
                <option key={p.id} value={p.id} disabled={p.id === p2Id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* VS divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-emerald-900/30" />
            <span className="text-amber-400 font-black text-sm tracking-widest">VS</span>
            <div className="flex-1 h-px bg-emerald-900/30" />
          </div>

          {/* Player 2 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-amber-400 uppercase tracking-widest">Player 2</label>
            <select
              value={p2Id}
              onChange={e => setP2Id(e.target.value)}
              className="w-full bg-charcoal-900 border border-amber-900/40 text-white rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-amber-600 appearance-none"
            >
              <option value="">— Select player —</option>
              {players.map(p => (
                <option key={p.id} value={p.id} disabled={p.id === p1Id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Starting score */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Starting Score</label>
            <div className="grid grid-cols-3 gap-2">
              {STARTING_SCORES.map(s => (
                <button
                  key={s}
                  onClick={() => setStartingScore(s)}
                  className={`py-3 rounded-xl font-black text-lg transition-all ${
                    startingScore === s
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                      : 'bg-charcoal-900 border border-charcoal-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Number of legs */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Play <span className="text-white">{totalLegs}</span> Leg{totalLegs !== 1 ? "s" : ""}
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button
                  key={n}
                  onClick={() => setTotalLegs(n)}
                  className={`py-2.5 rounded-lg font-bold text-sm transition-all ${
                    totalLegs === n
                      ? 'bg-amber-500 text-charcoal-950 shadow-md shadow-amber-900/30'
                      : 'bg-charcoal-900 border border-charcoal-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 text-center">
              Most legs wins
            </p>
          </div>
        </div>

        {/* Start button */}
        <div className="px-4 pb-8 pt-4 border-t border-emerald-900/20">
          <button
            onClick={handleStartSetup}
            disabled={!canStart}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-charcoal-800 disabled:text-gray-600 text-white font-black text-lg rounded-xl transition-all tracking-wide"
          >
            {canStart ? '🎯 Throw for Bull' : 'Select Both Players'}
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // PHASE: BULL THROW
  // ============================================================
  if (phase === 'bull') {
    const p1 = players.find(p => p.id === p1Id)!;
    const p2 = players.find(p => p.id === p2Id)!;
    return (
      <div className="fixed inset-0 z-50 bg-charcoal-950 flex flex-col items-center justify-center px-6 text-center">
        <div className="space-y-8 w-full max-w-sm">
          <div>
            <div className="text-5xl mb-4">🎯</div>
            <h2 className="text-3xl font-black text-white">Throw for Bull</h2>
            <p className="text-gray-500 text-sm mt-2">Closest to the bull throws first</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-gray-600 uppercase tracking-widest font-bold">Who won the bull?</p>
            <button
              onClick={() => handleBullWinner(0)}
              className="w-full py-4 bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xl rounded-xl transition-all border border-emerald-600/40"
            >
              {p1.name}
            </button>
            <button
              onClick={() => handleBullWinner(1)}
              className="w-full py-4 bg-amber-700 hover:bg-amber-600 text-white font-black text-xl rounded-xl transition-all border border-amber-600/40"
            >
              {p2.name}
            </button>
          </div>

          <button onClick={() => setPhase('setup')} className="text-gray-600 hover:text-gray-400 text-sm transition-colors">
            ← Back to setup
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // PHASE: LEG COMPLETE
  // ============================================================
  if (phase === 'leg_complete') {
    const winner = lastLegWinnerIdx === 0 ? player1! : player2!;
    const nextStarterIdx: 0 | 1 = currentStarterIdx === 0 ? 1 : 0;
    const nextStarter = nextStarterIdx === 0 ? player1! : player2!;
    return (
      <div className="fixed inset-0 z-50 bg-charcoal-950 flex flex-col items-center justify-center px-6 text-center">
        <div className="space-y-8 w-full max-w-sm">
          <div>
            <div className="text-5xl mb-4">🏆</div>
            <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Leg {currentLegNum} Winner</p>
            <h2 className="text-4xl font-black text-amber-400">{winner.name}</h2>
          </div>

          {/* Leg score so far */}
          <div className="bg-charcoal-900 border border-emerald-900/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="text-xs text-emerald-400 font-bold uppercase tracking-wide truncate">{player1!.name}</p>
                <p className="text-4xl font-black text-white mt-1">{p1LegsWon}</p>
              </div>
              <div className="px-4">
                <p className="text-gray-600 text-xs uppercase tracking-widest">Legs</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-xs text-amber-400 font-bold uppercase tracking-wide truncate">{player2!.name}</p>
                <p className="text-4xl font-black text-white mt-1">{p2LegsWon}</p>
              </div>
            </div>
            <p className="text-center text-xs text-gray-600 mt-3">{totalLegs - (p1LegsWon + p2LegsWon)} leg{totalLegs - (p1LegsWon + p2LegsWon) !== 1 ? 's' : ''} remaining</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              <span className="text-white font-bold">{nextStarter.name}</span> throws first in Leg {currentLegNum + 1}
            </p>
            <button
              onClick={startNextLeg}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-xl transition-all"
            >
              Start Leg {currentLegNum + 1} →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // PHASE: MATCH COMPLETE
  // ============================================================
  if (phase === 'match_complete') {
    const matchWinnerIdx = p1LegsWon > p2LegsWon ? 0 : p2LegsWon > p1LegsWon ? 1 : -1;
    const matchWinner = matchWinnerIdx >= 0 ? (matchWinnerIdx === 0 ? player1! : player2!) : null;
    return (
      <div className="fixed inset-0 z-50 bg-charcoal-950 flex flex-col items-center justify-center px-6 text-center">
        <div className="space-y-8 w-full max-w-sm">
          <div>
            <div className="text-6xl mb-4">{matchWinner ? '🏆' : '🤝'}</div>
            <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">{matchWinner ? 'Match Winner' : "It's a Draw!"}</p>
            {matchWinner && <h2 className="text-4xl font-black text-amber-400">{matchWinner.name}</h2>}
            <p className="text-white text-2xl font-black mt-3">
              {p1LegsWon} – {p2LegsWon}
            </p>
          </div>

          {/* Leg by leg summary */}
          <div className="bg-charcoal-900 border border-emerald-900/30 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Leg Results</p>
            {legResults.map((leg, i) => {
              const legWinner = leg.winnerId === p1Id ? player1! : player2!;
              const isP1 = leg.winnerId === p1Id;
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 w-12">Leg {leg.legNumber}</span>
                  <span className={`font-bold ${isP1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {legWinner.name}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <button
              onClick={resetAll}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-xl transition-all"
            >
              🎯 New Game
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 bg-charcoal-900 hover:bg-charcoal-800 text-gray-300 font-bold rounded-xl border border-charcoal-700 transition-all"
            >
              ← Back to League
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // PHASE: PLAYING
  // ============================================================
  const p1 = player1!;
  const p2 = player2!;
  const activeName = currentTurnIdx === 0 ? p1.name : p2.name;
  const activeColor = currentTurnIdx === 0 ? 'text-emerald-400' : 'text-amber-400';
  const activeBg = currentTurnIdx === 0 ? 'bg-emerald-950/30' : 'bg-amber-950/20';

  return (
    <div className="fixed inset-0 z-50 bg-charcoal-950 flex flex-col">
      {/* Header */}
      <div className="bg-charcoal-900 border-b border-emerald-900/30 px-4 py-3 flex items-center justify-between">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ✕ Exit
        </button>
        <span className="text-white font-black text-sm tracking-wider">
          🎯 LEG {currentLegNum} / {totalLegs}
        </span>
        <div className="text-xs text-gray-600 font-medium">{startingScore}</div>
      </div>

      {/* Legs won tracker */}
      <div className="bg-charcoal-900 border-b border-emerald-950/40 px-4 py-2">
        <div className="flex items-center justify-between px-2">
          <span className="text-emerald-400 font-black text-lg">{p1LegsWon}</span>
          <div className="flex gap-1.5">
            {Array.from({ length: totalLegs }).map((_, i) => {
              const leg = legResults[i];
              let color = 'bg-charcoal-800 border border-charcoal-700';
              if (leg?.winnerId === p1Id) color = 'bg-emerald-600';
              else if (leg?.winnerId === p2Id) color = 'bg-amber-500';
              return <div key={i} className={`w-3 h-3 rounded-full ${color}`} />;
            })}
          </div>
          <span className="text-amber-400 font-black text-lg">{p2LegsWon}</span>
        </div>
      </div>

      {/* Scoreboards */}
      <div className="grid grid-cols-2 gap-0 border-b border-emerald-950/40">
        {/* P1 */}
        <div className={`p-4 text-center border-r border-emerald-950/40 transition-all duration-300 ${currentTurnIdx === 0 ? 'bg-emerald-950/30' : 'bg-charcoal-950 opacity-60'}`}>
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest truncate mb-1">{p1.name}</p>
          {currentTurnIdx === 0 && (
            <div className="w-2 h-2 bg-emerald-400 rounded-full mx-auto mb-2 animate-pulse" />
          )}
          <p className="text-5xl font-black text-white tabular-nums">{scores[0]}</p>
        </div>

        {/* P2 */}
        <div className={`p-4 text-center transition-all duration-300 ${currentTurnIdx === 1 ? 'bg-amber-950/20' : 'bg-charcoal-950 opacity-60'}`}>
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest truncate mb-1">{p2.name}</p>
          {currentTurnIdx === 1 && (
            <div className="w-2 h-2 bg-amber-400 rounded-full mx-auto mb-2 animate-pulse" />
          )}
          <p className="text-5xl font-black text-white tabular-nums">{scores[1]}</p>
        </div>
      </div>

      {/* Input area */}
      <div className="flex-1 flex flex-col justify-end px-4 pb-6 pt-4 space-y-4">
        {/* Active player label */}
        <div className="text-center">
          <span className={`text-sm font-bold uppercase tracking-widest ${activeColor}`}>
            {activeName}&apos;s turn
          </span>
        </div>

        {/* Score display */}
        <div className={`border border-emerald-900/30 rounded-xl px-6 py-4 text-center transition-all ${activeBg}`}>
          <p className="text-4xl font-black text-white tabular-nums tracking-wider">
            {inputValue || '—'}
          </p>
          {error && <p className="text-rose-400 text-xs mt-2 font-medium">{error}</p>}
        </div>

        {/* Darts used selector — only shown when about to checkout */}
        {wouldFinish && (
          <div className="flex items-center justify-center gap-3">
            <span className="text-gray-500 text-xs uppercase tracking-wider">Darts used:</span>
            {([1, 2, 3] as const).map(d => (
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
                    setInputValue(prev => prev.slice(0, -1));
                    setError(null);
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
          disabled={!inputValue}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-charcoal-800 disabled:text-gray-600 text-white font-black text-lg rounded-xl transition-all tracking-wide"
        >
          ✓ Submit Score
        </button>
      </div>
    </div>
  );
}
