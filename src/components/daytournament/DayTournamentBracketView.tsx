import React from 'react';
import { DayTournamentRound, DayTournamentFixture, DayTournamentCompetitor, DayTournamentStatus } from '@/types';
import { dayFixtureWinnerId } from '@/lib/dayTournamentUtils';

interface DayTournamentBracketViewProps {
  rounds: DayTournamentRound[];
  fixtures: DayTournamentFixture[];
  competitors: DayTournamentCompetitor[];
  status: DayTournamentStatus;
  unitLabel: string;
}

export default function DayTournamentBracketView({ rounds, fixtures, competitors, status, unitLabel }: DayTournamentBracketViewProps) {
  const sortedRounds = [...rounds].sort((a, b) => a.sequence_order - b.sequence_order);
  const competitorMap = React.useMemo(() => new Map(competitors.map((c) => [c.id, c])), [competitors]);

  const finalRound = sortedRounds[sortedRounds.length - 1];
  const finalFixture = finalRound ? fixtures.find((f) => f.round_id === finalRound.id && !f.is_bye) : undefined;
  const championId = status === 'completed' && finalFixture ? dayFixtureWinnerId(finalFixture) : null;
  const champion = championId ? competitorMap.get(championId) : null;

  if (sortedRounds.length === 0) {
    return (
      <div className="text-center text-gray-500 py-10 bg-charcoal-900 border border-violet-950/60 rounded-xl">
        Bracket hasn&apos;t been generated yet — check back once the draw is made.
      </div>
    );
  }

  const allCurrentRoundDone = finalRound
    ? fixtures.filter((f) => f.round_id === finalRound.id).every((f) => f.completed)
    : false;

  return (
    <div className="w-full space-y-4">
      {champion && (
        <div className="rounded-2xl border border-violet-500/40 bg-violet-500/10 p-5 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-400">Champion</p>
          <p className="mt-1 text-2xl font-black text-white">🎉 {champion.display_name}</p>
        </div>
      )}

      {!champion && status === 'active' && allCurrentRoundDone && (
        <div className="rounded-xl border border-violet-800/40 bg-violet-950/30 p-3 text-center">
          <p className="text-xs text-violet-400 font-semibold">Round complete — next round pending</p>
        </div>
      )}

      <div className="overflow-x-auto no-scrollbar">
        <div className="flex gap-4 min-w-max pb-2">
          {sortedRounds.map((round) => {
            const roundFixtures = fixtures.filter((f) => f.round_id === round.id);
            return (
              <div key={round.id} className="w-60 shrink-0 space-y-3">
                <p className="text-xs font-bold text-violet-400 uppercase tracking-widest text-center">{round.name}</p>
                {roundFixtures.map((f) => {
                  const c1 = competitorMap.get(f.competitor_1_id);
                  const c2 = f.competitor_2_id ? competitorMap.get(f.competitor_2_id) : null;
                  const winnerId = dayFixtureWinnerId(f);
                  return (
                    <div key={f.id} className="bg-charcoal-900 border border-violet-950/60 rounded-xl p-3 space-y-1.5 shadow-md">
                      <div className={`flex items-center justify-between text-sm px-2 py-1 rounded ${winnerId === f.competitor_1_id ? 'bg-violet-950/50 text-violet-300 font-bold' : 'text-gray-300'}`}>
                        <span className="truncate">{c1?.display_name || '?'}</span>
                        {f.completed && !f.is_bye && <span className="font-mono">{f.competitor_1_legs}</span>}
                      </div>
                      {f.is_bye ? (
                        <div className="text-center text-[10px] text-gray-500 py-1">BYE</div>
                      ) : (
                        <div className={`flex items-center justify-between text-sm px-2 py-1 rounded ${winnerId === f.competitor_2_id ? 'bg-violet-950/50 text-violet-300 font-bold' : 'text-gray-300'}`}>
                          <span className="truncate">{c2?.display_name || '?'}</span>
                          {f.completed && <span className="font-mono">{f.competitor_2_legs}</span>}
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
      <p className="text-center text-[10px] text-gray-600 uppercase tracking-widest">Best of — {unitLabel} shown per completed match</p>
    </div>
  );
}
