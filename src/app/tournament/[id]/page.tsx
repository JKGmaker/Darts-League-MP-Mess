import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { DayTournament, DayTournamentRound, DayTournamentFixture, DayTournamentCompetitor, DayTournamentEntrant } from '@/types';
import DayTournamentBracketView from '@/components/daytournament/DayTournamentBracketView';

export const revalidate = 30;

async function getData(id: string) {
  const [{ data: tournament }, { data: rounds }, { data: competitors }, { data: entrants }] = await Promise.all([
    supabase.from('day_tournaments').select('*').eq('id', id).single(),
    supabase.from('day_tournament_rounds').select('*').eq('tournament_id', id).order('sequence_order'),
    supabase.from('day_tournament_competitors').select('*').eq('tournament_id', id),
    supabase.from('day_tournament_entrants').select('*').eq('tournament_id', id),
  ]);

  const roundIds = ((rounds as DayTournamentRound[]) || []).map((r) => r.id);
  const { data: fixtures } = roundIds.length
    ? await supabase.from('day_tournament_fixtures').select('*').in('round_id', roundIds)
    : { data: [] as DayTournamentFixture[] };

  return {
    tournament: tournament as DayTournament | null,
    rounds: (rounds as DayTournamentRound[]) || [],
    fixtures: (fixtures as DayTournamentFixture[]) || [],
    competitors: (competitors as DayTournamentCompetitor[]) || [],
    entrants: (entrants as DayTournamentEntrant[]) || [],
  };
}

export default async function TournamentDetailPage({ params }: { params: { id: string } }) {
  const { tournament, rounds, fixtures, competitors, entrants } = await getData(params.id);

  if (!tournament) notFound();

  const unitLabel = tournament.sport === 'pool' ? 'Frames' : 'Legs';

  return (
    <div className="min-h-screen bg-charcoal-950">
      <header className="border-b border-violet-900/30 bg-gradient-to-br from-violet-900/30 via-charcoal-950 to-charcoal-950">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <Link href="/tournament" className="text-xs font-semibold text-gray-400 hover:text-white transition-colors">
            ← Back to Tournaments
          </Link>
          <div className="mt-4 flex items-end gap-3">
            <span className="text-4xl">{tournament.sport === 'pool' ? '🎱' : '🎯'}</span>
            <div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none">{tournament.name}</h1>
              <p className="mt-1 text-sm font-bold text-violet-400 capitalize">
                {tournament.sport} · {tournament.mode} · Knockout · Best to {tournament.legs_per_game} {unitLabel.toLowerCase()} · {tournament.status}
              </p>
              {tournament.event_date && (
                <p className="mt-1 text-xs text-gray-500">
                  {new Date(tournament.event_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <DayTournamentBracketView rounds={rounds} fixtures={fixtures} competitors={competitors} status={tournament.status} unitLabel={unitLabel} />

        {entrants.length > 0 && rounds.length === 0 && (
          <div className="bg-charcoal-900 border border-violet-950/60 rounded-xl p-4">
            <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-2">Entrants ({entrants.length})</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {entrants.map((e) => (
                <div key={e.id} className="text-sm text-gray-300 px-3 py-1.5 bg-charcoal-950 rounded-lg truncate">{e.name}</div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
