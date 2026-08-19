'use client';

import React from 'react';
import { DayTournamentRound, DayTournamentFixture, DayTournamentCompetitor, DayTournamentPlayer, DayTournamentStatus } from '@/types';
import { dayFixtureWinnerId, competitorLabel } from '@/lib/dayTournamentUtils';

interface DayTournamentBracketViewProps {
  rounds: DayTournamentRound[];
  fixtures: DayTournamentFixture[];
  competitors: DayTournamentCompetitor[];
  players: DayTournamentPlayer[];
  tournamentStatus: DayTournamentStatus;
}

export default function DayTournamentBracketView({ rounds, fixtures, competitors, players, tournamentStatus }: DayTournamentBracketViewProps) {
  const sortedRounds = [...rounds].sort((a, b) => a.sequence_order - b.sequence_order);
  const playerMap = React.useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const competitorMap = React.useMemo(() => new Map(competitors.map((c) => [c.id, c])), [competitors]);
  const nameFor = (id: string) => {
    const c = competitorMap.get(id);
    return c ? competitorLabel(c, playerMap) : '?';
  };

  const finalRound = sortedRounds[sortedRounds.length - 1];
  const finalFixture = finalRound ? fixtures.find((f) => f.round_id === finalRound.id && !f.is_bye) : undefined;
  const championId = tournamentStatus === 'completed' && finalFixture ? dayFixtureWinnerId(finalFixture) : null;
  const champion = championId ? nameFor(championId) : null;

  if (sortedRounds.length === 0) {
    return (
      <div className="text-center text-gray-500 py-10 bg-charcoal-900 border border-emerald-950/60 rounded-xl">
        Bracket hasn&apos;t been generated yet.
      </div>
    );
  }

  const allCurrentRoundDone = finalRound
    ? fixtures.filter((f) => f.round_id === finalRound.id).every((f) => f.completed)
    : false;

  return (
    <div className="w-full space-y-4">
      {champion && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Champion</p>
          <p className="mt-1 text-2xl font-black text-white">🎉 {champion}</p>
        </div>
      )}

      {!champion && tournamentStatus === 'active' && allCurrentRoundDone && (
        <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/30 p-3 text-center">
          <p className="text-xs text-emerald-400 font-semibold">Round complete — next round pending</p>
        </div>
      )}

      <div className="overflow-x-auto no-scrollbar">
        <div className="flex gap-4 min-w-max pb-2">
          {sortedRounds.map((round) => {
            const roundFixtures = fixtures.filter((f) => f.round_id === round.id);
            return (
              <div key={round.id} className="w-60 shrink-0 space-y-3">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest text-center">{round.name}</p>
                {roundFixtures.map((f) => {
                  const winnerId = dayFixtureWinnerId(f);
                  return (
                    <div key={f.id} className="bg-charcoal-900 border border-emerald-950/60 rounded-xl p-3 space-y-1.5 shadow-md">
                      <div className={`flex items-center justify-between text-sm px-2 py-1 rounded gap-2 ${winnerId === f.competitor_1_id ? 'bg-emerald-950/50 text-emerald-300 font-bold' : 'text-gray-300'}`}>
                        <span className="truncate">{nameFor(f.competitor_1_id)}</span>
                        {f.completed && !f.is_bye && <span className="font-mono shrink-0">{f.competitor_1_score}</span>}
                      </div>
                      {f.is_bye ? (
                        <div className="text-center text-[10px] text-gray-500 py-1">BYE</div>
                      ) : (
                        <div className={`flex items-center justify-between text-sm px-2 py-1 rounded gap-2 ${winnerId === f.competitor_2_id ? 'bg-emerald-950/50 text-emerald-300 font-bold' : 'text-gray-300'}`}>
                          <span className="truncate">{f.competitor_2_id ? nameFor(f.competitor_2_id) : '?'}</span>
                          {f.completed && <span className="font-mono shrink-0">{f.competitor_2_score}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
