import { supabase } from '@/lib/supabase';
import { calculateStandings } from '@/lib/utils';
import { Player, Week, Fixture } from '@/types';
import LeagueTable from '@/components/LeagueTable';
import PublicFixtures from '@/components/PublicFixtures';
import ScoreButton from '@/components/ScoreButton';

export const revalidate = 60;

async function getData() {
  const [{ data: players }, { data: weeks }, { data: fixtures }] = await Promise.all([
    supabase.from('players').select('*').order('name'),
    supabase.from('weeks').select('*').order('sequence_order'),
    supabase.from('fixtures').select('*'),
  ]);
  return {
    players: (players as Player[]) || [],
    weeks: (weeks as Week[]) || [],
    fixtures: (fixtures as Fixture[]) || [],
  };
}

export default async function HomePage() {
  const { players, weeks, fixtures } = await getData();
  const standings = calculateStandings(players, fixtures);

  return (
    <div className="min-h-screen bg-charcoal-950">
      <header className="relative min-h-[60vh] flex items-end overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/hero.jpg')" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-950/60 to-transparent" />
        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 pb-12 pt-32">
          <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tight leading-none drop-shadow-lg">MP Mess</h1>
          <h2 className="text-4xl sm:text-6xl font-black text-amber-400 tracking-tight leading-none drop-shadow-lg">Darts League</h2>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* Score a Game button */}
        <ScoreButton players={players} />
        <section><LeagueTable standings={standings} /></section>
        <section><PublicFixtures weeks={weeks} fixtures={fixtures} players={players} /></section>
      </main>
      <footer className="border-t border-emerald-900/20 mt-12 py-6 text-center text-xs text-gray-600">
        <p>MP Mess Darts League &copy; {new Date().getFullYear()}. All rights reserved.</p>
      </footer>
    </div>
  );
}
