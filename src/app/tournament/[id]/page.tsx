import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { calculateDayTournamentStandings } from '@/lib/dayTournamentUtils';
import { DayTournament, DayTournamentRound, DayTournamentFixture, DayTournamentCompetitor, DayTournamentPlayer } from '@/types';
import DayTournamentBracketView from '@/components/daytournament/DayTournamentBracketView';
import DayTournamentFixturesView from '@/components/daytournament/DayTournamentFixturesView';
import DayTournamentStandingsTable from '@/components/daytournament/DayTournamentStandingsTable';

export const revalidate = 30;

async function getData(id: string) {
  const [{ data: tournament }, { data: rounds }, { data: competitors }, { data: allPlayers }] = await Promise.all([
    supabase.from('day_tournaments').select('*').eq('id', id).single(),
    supabase.from('day_tournament_rounds').select('*').eq('tournament_id', id).order('sequence_order'),
    supabase.from('day_tournament_competitors').select('*').eq('tournament_id', id),
    supabase.from('day_tournament_players').select('*'),
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
    players: (allPlayers as DayTournamentPlayer[]) || [],
  };
}

export default async function DayTournamentPage({ params }: { params: { id: string } }) {
  const { tournament, rounds, fixtures, competitors, players } = await getData(params.id);

  if (!tournament) notFound();

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const standings = tournament.format === 'league' ? calculateDayTournamentStandings(competitors, fixtures, playerMap) : [];

  return (
    <div className="min-h-screen bg-charcoal-950">
      <header className="border-b border-emerald-900/30 bg-gradient-to-br from-emerald-900/30 via-charcoal-950 to-charcoal-950">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <Link href="/tournament" className="text-xs font-semibold text-gray-400 hover:text-white transition-colors">
            ← Back to One-Day Tournaments
          </Link>
          <div className="mt-4 flex items-end gap-3">
            <span className="text-4xl">{tournament.sport === 'darts' ? '🎯' : '🎱'}</span>
            <div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none">{tournament.name}</h1>
              <p className="mt-1 text-sm font-bold text-emerald-400 capitalize">
                {tournament.sport} · {tournament.entry_type} · {tournament.format} · {tournament.status}
                {tournament.event_date && ` · ${new Date(tournament.event_date + 'T00:00:00').toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}`}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {tournament.format === 'league' ? (
          <>
            <DayTournamentStandingsTable standings={standings} />
            <DayTournamentFixturesView rounds={rounds} fixtures={fixtures} competitors={competitors} players={players} />
          </>
        ) : (
          <DayTournamentBracketView rounds={rounds} fixtures={fixtures} competitors={competitors} players={players} tournamentStatus={tournament.status} />
        )}
      </main>
    </div>
  );
}
