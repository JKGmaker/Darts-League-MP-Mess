'use client';

import React, { useState } from 'react';
import { PoolRound, PoolFixture, PoolPlayer } from '@/types';

interface PoolFixturesViewProps {
  rounds: PoolRound[];
  fixtures: PoolFixture[];
  players: PoolPlayer[];
}

export default function PoolFixturesView({ rounds, fixtures, players }: PoolFixturesViewProps) {
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

  return (
    <div className="w-full space-y-4">
      <div className="p-4 bg-gradient-to-r from-sky-950 to-charcoal-900 border border-sky-800/40 rounded-xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="w-2 h-5 bg-sky-400 rounded-sm inline-block"></span>
          Fixtures &amp; Results
        </h2>
      </div>

      {sortedRounds.length > 0 && (
        <div className="sticky top-0 z-20 bg-charcoal-950/90 backdrop-blur-md py-2 border-b border-sky-900/30 overflow-x-auto no-scrollbar flex gap-2">
          {sortedRounds.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRoundId(r.id)}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 focus:outline-none ${
                activeRoundId === r.id
                  ? 'bg-sky-600 text-white shadow-lg border border-sky-500'
                  : 'bg-charcoal-900 text-gray-400 border border-charcoal-800 hover:text-white hover:bg-charcoal-800'
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {activeFixtures.length === 0 ? (
          <p className="text-gray-500 py-6 text-center sm:col-span-2">
            No fixtures scheduled for this round.
          </p>
        ) : (
          activeFixtures.map((f) => {
            const p1 = playerMap.get(f.player_1_id);
            const p2 = f.player_2_id ? playerMap.get(f.player_2_id) : null;
            return (
              <div
                key={f.id}
                className="bg-charcoal-900 border border-sky-950/60 rounded-xl p-4 flex flex-col gap-3 shadow-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-base font-bold truncate ${
                        f.is_bye || (f.completed && f.player_1_score > f.player_2_score)
                          ? 'text-sky-400'
                          : 'text-gray-200'
                      }`}
                    >
                      {p1?.name || 'Unknown Player'}
                    </p>
                  </div>

                  <div className="flex items-center justify-center bg-charcoal-950 rounded-lg px-3 py-1.5 border border-sky-900/30 min-w-[70px]">
                    {f.is_bye ? (
                      <span className="text-xs font-semibold text-sky-500 tracking-wider uppercase">BYE</span>
                    ) : f.completed ? (
                      <span className="font-mono text-base font-black tracking-widest text-white">
                        {f.player_1_score}-{f.player_2_score}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-sky-500 tracking-wider uppercase">VS</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 text-right">
                    <p
                      className={`text-base font-bold truncate ${
                        f.completed && f.player_2_score > f.player_1_score ? 'text-sky-400' : 'text-gray-200'
                      }`}
                    >
                      {f.is_bye ? '—' : p2?.name || 'Unknown Player'}
                    </p>
                  </div>
                </div>

                <div className="pt-1 border-t border-sky-950/40">
                  {f.is_bye ? (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 py-1">
                      <span>✓</span>
                      <span>Bye — advances automatically</span>
                    </div>
                  ) : f.completed ? (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 py-1">
                      <span>✓</span>
                      <span>Match complete</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-sky-500 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse inline-block" />
                      <span>Scheduled</span>
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
