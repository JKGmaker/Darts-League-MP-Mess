'use client';

import React from 'react';
import { PoolRound, PoolFixture, PoolPlayer, PoolTournamentStatus } from '@/types';
import { fixtureWinnerId } from '@/lib/poolUtils';

interface PoolBracketViewProps {
  rounds: PoolRound[];
  fixtures: PoolFixture[];
  players: PoolPlayer[];
  tournamentStatus: PoolTournamentStatus;
}

export default function PoolBracketView({ rounds, fixtures, players, tournamentStatus }: PoolBracketViewProps) {
  const sortedRounds = [...rounds].sort((a, b) => a.sequence_order - b.sequence_order);
  const playerMap = React.useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const finalRound = sortedRounds[sortedRounds.length - 1];
  const finalFixture = finalRound
    ? fixtures.find((f) => f.round_id === finalRound.id && !f.is_bye)
    : undefined;
  // Only treat this as the actual final once the tournament has been marked
  // completed (i.e. an admin generated a next round and got down to 1
  // winner) — a round simply being the most recent one doesn't mean it's
  // the final.
  const championId = tournamentStatus === 'completed' && finalFixture ? fixtureWinnerId(finalFixture) : null;
  const champion = championId ? playerMap.get(championId) : null;

  if (sortedRounds.length === 0) {
    return (
      <div className="text-center text-gray-500 py-10 bg-charcoal-900 border border-sky-950/60 rounded-xl">
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
        <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 p-5 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-sky-400">Champion</p>
          <p className="mt-1 text-2xl font-black text-white">🎉 {champion.name}</p>
        </div>
      )}

      {!champion && tournamentStatus === 'active' && allCurrentRoundDone && (
        <div className="rounded-xl border border-sky-800/40 bg-sky-950/30 p-3 text-center">
          <p className="text-xs text-sky-400 font-semibold">Round complete — next round pending</p>
        </div>
      )}

      <div className="overflow-x-auto no-scrollbar">
        <div className="flex gap-4 min-w-max pb-2">
          {sortedRounds.map((round) => {
            const roundFixtures = fixtures.filter((f) => f.round_id === round.id);
            return (
              <div key={round.id} className="w-56 shrink-0 space-y-3">
                <p className="text-xs font-bold text-sky-400 uppercase tracking-widest text-center">{round.name}</p>
                {roundFixtures.map((f) => {
                  const p1 = playerMap.get(f.player_1_id);
                  const p2 = f.player_2_id ? playerMap.get(f.player_2_id) : null;
                  const winnerId = fixtureWinnerId(f);
                  return (
                    <div key={f.id} className="bg-charcoal-900 border border-sky-950/60 rounded-xl p-3 space-y-1.5 shadow-md">
                      <div className={`flex items-center justify-between text-sm px-2 py-1 rounded ${winnerId === f.player_1_id ? 'bg-sky-950/50 text-sky-300 font-bold' : 'text-gray-300'}`}>
                        <span className="truncate">{p1?.name || '?'}</span>
                        {f.completed && !f.is_bye && <span className="font-mono">{f.player_1_score}</span>}
                      </div>
                      {f.is_bye ? (
                        <div className="text-center text-[10px] text-gray-500 py-1">BYE</div>
                      ) : (
                        <div className={`flex items-center justify-between text-sm px-2 py-1 rounded ${winnerId === f.player_2_id ? 'bg-sky-950/50 text-sky-300 font-bold' : 'text-gray-300'}`}>
                          <span className="truncate">{p2?.name || '?'}</span>
                          {f.completed && <span className="font-mono">{f.player_2_score}</span>}
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
