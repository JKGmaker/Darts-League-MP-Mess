'use client';

import React, { useState } from 'react';
import { Week, Fixture, Player } from '@/types';

interface PublicFixturesProps {
  weeks: Week[];
  fixtures: Fixture[];
  players: Player[];
}

export default function PublicFixtures({ weeks, fixtures, players }: PublicFixturesProps) {
  const sortedWeeks = [...weeks].sort((a, b) => a.sequence_order - b.sequence_order);
  const [activeWeekId, setActiveWeekId] = useState<string | null>(
    sortedWeeks.length > 0 ? sortedWeeks[0].id : null
  );

  React.useEffect(() => {
    if (sortedWeeks.length > 0 && !activeWeekId) {
      setActiveWeekId(sortedWeeks[0].id);
    }
  }, [weeks, sortedWeeks, activeWeekId]);

  const activeFixtures = fixtures.filter((f) => f.week_id === activeWeekId);
  const playerMap = React.useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  return (
    <div className="w-full space-y-4">
      <div className="p-4 bg-gradient-to-r from-emerald-950 to-charcoal-900 border border-emerald-800/40 rounded-xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="w-2 h-5 bg-amber-500 rounded-sm inline-block"></span>
          Match Fixtures &amp; Results
        </h2>
      </div>

      {sortedWeeks.length > 0 && (
        <div className="sticky top-0 z-20 bg-charcoal-950/90 backdrop-blur-md py-2 border-b border-emerald-900/30 overflow-x-auto no-scrollbar flex gap-2">
          {sortedWeeks.map((w) => (
            <button
              key={w.id}
              onClick={() => setActiveWeekId(w.id)}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 focus:outline-none ${
                activeWeekId === w.id
                  ? 'bg-emerald-600 text-white shadow-lg border border-emerald-500'
                  : 'bg-charcoal-900 text-gray-400 border border-charcoal-800 hover:text-white hover:bg-charcoal-800'
              }`}
            >
              {w.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {activeFixtures.length === 0 ? (
          <p className="text-gray-500 py-6 text-center sm:col-span-2">
            No fixtures scheduled for this selection period.
          </p>
        ) : (
          activeFixtures.map((f) => {
            const p1 = playerMap.get(f.player_1_id);
            const p2 = playerMap.get(f.player_2_id);
            return (
              <div
                key={f.id}
                className="bg-charcoal-900 border border-emerald-950/60 rounded-xl p-4 flex flex-col gap-3 shadow-md"
              >
                {/* Score row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-base font-bold truncate ${
                        f.completed && f.player_1_score > f.player_2_score
                          ? 'text-amber-400'
                          : 'text-gray-200'
                      }`}
                    >
                      {p1?.name || 'Unknown Player'}
                    </p>
                  </div>

                  <div className="flex items-center justify-center bg-charcoal-950 rounded-lg px-3 py-1.5 border border-emerald-900/30 min-w-[70px]">
                    {f.completed ? (
                      <span className="font-mono text-base font-black tracking-widest text-white">
                        {f.player_1_score}-{f.player_2_score}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-500 tracking-wider uppercase">VS</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 text-right">
                    <p
                      className={`text-base font-bold truncate ${
                        f.completed && f.player_2_score > f.player_1_score
                          ? 'text-amber-400'
                          : 'text-gray-200'
                      }`}
                    >
                      {p2?.name || 'Unknown Player'}
                    </p>
                  </div>
                </div>

                {/* Status row */}
                <div className="pt-1 border-t border-emerald-950/40">
                  {f.completed ? (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 py-1">
                      <span>✓</span>
                      <span>Match complete</span>
                      {f.best_of ? <span className="text-gray-600">· Best of {f.best_of}</span> : null}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-500 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                      <span>Scheduled</span>
                      {f.best_of ? <span className="text-gray-600">· Best of {f.best_of}</span> : null}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
