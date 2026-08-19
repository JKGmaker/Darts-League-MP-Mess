'use client';

import React, { useState } from 'react';
import { DayTournamentRound, DayTournamentFixture, DayTournamentCompetitor, DayTournamentPlayer } from '@/types';
import { competitorLabel } from '@/lib/dayTournamentUtils';

interface DayTournamentFixturesViewProps {
  rounds: DayTournamentRound[];
  fixtures: DayTournamentFixture[];
  competitors: DayTournamentCompetitor[];
  players: DayTournamentPlayer[];
}

export default function DayTournamentFixturesView({ rounds, fixtures, competitors, players }: DayTournamentFixturesViewProps) {
  const sortedRounds = [...rounds].sort((a, b) => a.sequence_order - b.sequence_order);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(
    sortedRounds.length > 0 ? sortedRounds[sortedRounds.length - 1].id : null
  );

  React.useEffect(() => {
    if (sortedRounds.length > 0 && !activeRoundId) {
      setActiveRoundId(sortedRounds[sortedRounds.length - 1].id);
    }
  }, [rounds, sortedRounds, activeRoundId]);

  const activeFixtures = fixtures.filter((f) => f.round_id === activeRoundId);
  const playerMap = React.useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const competitorMap = React.useMemo(() => new Map(competitors.map((c) => [c.id, c])), [competitors]);
  const nameFor = (id: string) => {
    const c = competitorMap.get(id);
    return c ? competitorLabel(c, playerMap) : 'Unknown';
  };

  return (
    <div className="w-full space-y-4">
      <div className="p-4 bg-gradient-to-r from-emerald-950 to-charcoal-900 border border-emerald-800/40 rounded-xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="w-2 h-5 bg-emerald-400 rounded-sm inline-block"></span>
          Fixtures &amp; Results
        </h2>
      </div>

      {sortedRounds.length > 0 && (
        <div className="sticky top-0 z-20 bg-charcoal-950/90 backdrop-blur-md py-2 border-b border-emerald-900/30 overflow-x-auto no-scrollbar flex gap-2">
          {sortedRounds.map((r) => (
            <button key={r.id} onClick={() => setActiveRoundId(r.id)}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 focus:outline-none ${
                activeRoundId === r.id
                  ? 'bg-emerald-600 text-white shadow-lg border border-emerald-500'
                  : 'bg-charcoal-900 text-gray-400 border border-charcoal-800 hover:text-white hover:bg-charcoal-800'
              }`}>
              {r.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {activeFixtures.length === 0 ? (
          <p className="text-gray-500 py-6 text-center sm:col-span-2">No fixtures scheduled for this round.</p>
        ) : (
          activeFixtures.map((f) => (
            <div key={f.id} className="bg-charcoal-900 border border-emerald-950/60 rounded-xl p-4 flex flex-col gap-3 shadow-md">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className={`text-base font-bold truncate ${f.is_bye || (f.completed && f.competitor_1_score > f.competitor_2_score) ? 'text-emerald-400' : 'text-gray-200'}`}>
                    {nameFor(f.competitor_1_id)}
                  </p>
                </div>

                <div className="flex items-center justify-center bg-charcoal-950 rounded-lg px-3 py-1.5 border border-emerald-900/30 min-w-[70px]">
                  {f.is_bye ? (
                    <span className="text-xs font-semibold text-emerald-500 tracking-wider uppercase">BYE</span>
                  ) : f.completed ? (
                    <span className="font-mono text-base font-black tracking-widest text-white">{f.competitor_1_score}-{f.competitor_2_score}</span>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-500 tracking-wider uppercase">VS</span>
                  )}
                </div>

                <div className="flex-1 min-w-0 text-right">
                  <p className={`text-base font-bold truncate ${f.completed && f.competitor_2_score > f.competitor_1_score ? 'text-emerald-400' : 'text-gray-200'}`}>
                    {f.is_bye ? '—' : f.competitor_2_id ? nameFor(f.competitor_2_id) : 'Unknown'}
                  </p>
                </div>
              </div>

              <div className="pt-1 border-t border-emerald-950/40">
                {f.is_bye ? (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 py-1"><span>✓</span><span>Bye — walkover win (2 pts)</span></div>
                ) : f.completed ? (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 py-1"><span>✓</span><span>Best of {f.best_of} legs — match complete</span></div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-500 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    <span>Best of {f.best_of} legs — scheduled</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
