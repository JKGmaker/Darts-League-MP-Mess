import Link from 'next/link';
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

        {/* Play-off bracket buttons */}
        <section className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/playoffs/championship"
            className="group relative flex items-center justify-between gap-3 px-6 py-5 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg shadow-amber-900/30 transition-all duration-200 hover:scale-[1.02] active:scale-100"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl group-hover:scale-110 transition-transform">🏆</span>
              <div>
                <p className="text-xl font-black tracking-wide leading-none">Championship</p>
                <p className="text-xs font-semibold text-amber-100/90 mt-1">Play-offs · Seeds 1–8</p>
              </div>
            </div>
            <span className="text-2xl opacity-80 group-hover:translate-x-1 transition-transform">→</span>
          </Link>

          <Link
            href="/playoffs/shield"
            className="group relative flex items-center justify-between gap-3 px-6 py-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-white shadow-lg shadow-emerald-900/30 transition-all duration-200 hover:scale-[1.02] active:scale-100"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl group-hover:scale-110 transition-transform">🛡️</span>
              <div>
                <p className="text-xl font-black tracking-wide leading-none">Shield</p>
                <p className="text-xs font-semibold text-emerald-100/90 mt-1">Play-offs · Seeds 9–17</p>
              </div>
            </div>
            <span className="text-2xl opacity-80 group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </section>

        <section><LeagueTable standings={standings} /></section>
        <section><PublicFixtures weeks={weeks} fixtures={fixtures} players={players} /></section>
      </main>
      <footer className="border-t border-emerald-900/20 mt-12 py-6 text-center text-xs text-gray-600">
        <p>MP Mess Darts League &copy; {new Date().getFullYear()}. All rights reserved.</p>
      </footer>
    </div>
  );
}
