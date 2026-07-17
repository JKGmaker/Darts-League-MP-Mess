import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { calculatePoolStandings } from '@/lib/poolUtils';
import { PoolTournament, PoolRound, PoolFixture, PoolPlayer } from '@/types';
import PoolStandingsTable from '@/components/pool/PoolStandingsTable';
import PoolFixturesView from '@/components/pool/PoolFixturesView';
import PoolBracketView from '@/components/pool/PoolBracketView';

export const revalidate = 30;

async function getData(id: string) {
  const [{ data: tournament }, { data: rounds }, { data: tournamentPlayers }, { data: allPlayers }] =
    await Promise.all([
      supabase.from('pool_tournaments').select('*').eq('id', id).single(),
      supabase.from('pool_rounds').select('*').eq('tournament_id', id).order('sequence_order'),
      supabase.from('pool_tournament_players').select('player_id').eq('tournament_id', id),
      supabase.from('pool_players').select('*'),
    ]);

  const roundIds = ((rounds as PoolRound[]) || []).map((r) => r.id);
  const { data: fixtures } = roundIds.length
    ? await supabase.from('pool_fixtures').select('*').in('round_id', roundIds)
    : { data: [] as PoolFixture[] };

  const entrantIds = new Set(((tournamentPlayers as { player_id: string }[]) || []).map((tp) => tp.player_id));
  const players = ((allPlayers as PoolPlayer[]) || []).filter((p) => entrantIds.has(p.id));

  return {
    tournament: tournament as PoolTournament | null,
    rounds: (rounds as PoolRound[]) || [],
    fixtures: (fixtures as PoolFixture[]) || [],
    players,
  };
}

export default async function PoolTournamentPage({ params }: { params: { id: string } }) {
  const { tournament, rounds, fixtures, players } = await getData(params.id);

  if (!tournament) notFound();

  const standings = tournament.format === 'league' ? calculatePoolStandings(players, fixtures) : [];

  return (
    <div className="min-h-screen bg-charcoal-950">
      <header className="border-b border-sky-900/30 bg-gradient-to-br from-sky-900/30 via-charcoal-950 to-charcoal-950">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <Link href="/pool" className="text-xs font-semibold text-gray-400 hover:text-white transition-colors">
            ← Back to Pool
          </Link>
          <div className="mt-4 flex items-end gap-3">
            <span className="text-4xl">{tournament.format === 'knockout' ? '🏆' : '🎱'}</span>
            <div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none">{tournament.name}</h1>
              <p className="mt-1 text-sm font-bold text-sky-400 capitalize">{tournament.format} · {tournament.status}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {tournament.format === 'league' ? (
          <>
            <PoolStandingsTable standings={standings} />
            <PoolFixturesView rounds={rounds} fixtures={fixtures} players={players} />
          </>
        ) : (
          <PoolBracketView rounds={rounds} fixtures={fixtures} players={players} tournamentStatus={tournament.status} />
        )}
      </main>
    </div>
  );
}
