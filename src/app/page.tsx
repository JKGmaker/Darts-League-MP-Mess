import { supabase } from '@/lib/supabase';
import { calculateStandings } from '@/lib/utils';
import { Player, Week, Fixture } from '@/types';
import LeagueTable from '@/components/LeagueTable';
import PublicFixtures from '@/components/PublicFixtures';
import HeroImage from '@/components/HeroImage';

// Revalidate every 60 seconds for near-real-time updates
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
      {/* Hero Header */}
      <header className="relative overflow-hidden border-b border-emerald-900/40">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/60 via-charcoal-950/80 to-charcoal-950 z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent z-10" />
        <div className="relative z-20 max-w-6xl mx-auto px-4 py-10 sm:py-16 flex flex-col sm:flex-row items-center gap-6">
          <HeroImage />
          <div>
            <p className="text-emerald-400 text-xs font-bold tracking-[0.3em] uppercase mb-1">Official League</p>
            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none">
              MP Mess
            </h1>
            <h2 className="text-3xl sm:text-5xl font-black text-amber-400 tracking-tight leading-none">
              Darts League
            </h2>
            <p className="text-gray-400 text-sm mt-3 font-medium">
              Live standings · Fixtures · Results
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        <section>
          <LeagueTable standings={standings} />
        </section>
        <section>
          <PublicFixtures weeks={weeks} fixtures={fixtures} players={players} />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-emerald-900/20 mt-12 py-6 text-center text-xs text-gray-600">
        <p>MP Mess Darts League &copy; {new Date().getFullYear()}. All rights reserved.</p>
      </footer>
    </div>
  );
}
