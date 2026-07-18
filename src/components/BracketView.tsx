import React from 'react';
import { ResolvedMatch, ResolvedSlot } from '@/lib/playoffs';
import { Bracket } from '@/types';

interface BracketViewProps {
  bracket: Bracket;
  matches: ResolvedMatch[];
  locked: boolean;
}

function SlotRow({ slot, isWinner, score, showScore }: { slot: ResolvedSlot; isWinner: boolean; score: number; showScore: boolean }) {
  const known = !!slot.player;
  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg ${
        isWinner ? 'bg-amber-500/15 border border-amber-500/40' : 'bg-charcoal-950 border border-emerald-900/30'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {slot.seed && (
          <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold bg-emerald-900/50 text-emerald-300">
            {slot.seed}
          </span>
        )}
        <span
          className={`truncate text-sm font-semibold ${
            isWinner ? 'text-amber-300' : known ? 'text-gray-200' : 'text-gray-500 italic'
          }`}
        >
          {slot.label}
        </span>
      </div>
      {showScore && (
        <span className={`shrink-0 font-mono font-black text-sm ${isWinner ? 'text-amber-300' : 'text-white'}`}>
          {score}
        </span>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: ResolvedMatch }) {
  const { slot1, slot2, winner, completed, bestOf, player1Score, player2Score } = match;
  const showScore = completed;
  const w1 = !!winner && slot1.player?.id === winner.id;
  const w2 = !!winner && slot2.player?.id === winner.id;

  return (
    <div className="bg-charcoal-900 border border-emerald-950 rounded-xl p-3 space-y-2 w-64 shrink-0">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">{match.def.label}</span>
        <span className="text-[10px] font-semibold text-gray-500">Best of {bestOf}</span>
      </div>
      <div className="space-y-1.5">
        <SlotRow slot={slot1} isWinner={w1} score={player1Score} showScore={showScore} />
        <SlotRow slot={slot2} isWinner={w2} score={player2Score} showScore={showScore} />
      </div>
      <div className="pt-0.5 text-center">
        {completed ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
            <span>✓</span> Result confirmed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" /> Awaiting result
          </span>
        )}
      </div>
    </div>
  );
}

export default function BracketView({ matches, locked }: BracketViewProps) {
  const visibleMatches = matches.filter((m) => !m.excluded);
  const rounds = Array.from(new Set(visibleMatches.map((m) => m.def.round))).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {!locked && (
        <div className="rounded-xl border border-amber-700/40 bg-amber-900/10 px-4 py-3 text-sm text-amber-300">
          <span className="font-bold">Provisional.</span> Seeds update live with the league table. Final positions are
          locked in from the admin panel once Week 10 is complete.
        </div>
      )}

      <div className="overflow-x-auto no-scrollbar pb-2">
        <div className="flex gap-4 min-w-min">
          {rounds.map((r) => {
            const roundMatches = visibleMatches.filter((m) => m.def.round === r);
            const roundLabel = roundMatches[0]?.def.roundLabel || `Round ${r}`;
            return (
              <div key={r} className="flex flex-col gap-3">
                <div className="px-1">
                  <span className="text-xs font-black uppercase tracking-widest text-amber-400">{roundLabel}</span>
                </div>
                <div className="flex flex-col gap-4 justify-center h-full">
                  {roundMatches.map((m) => (
                    <MatchCard key={m.def.code} match={m} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
