import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { DayTournament } from '@/types';

export const revalidate = 30;

export const metadata = {
  title: 'MP Mess — 1-Day Tournament',
  description: 'One-day knockout tournaments for MP Mess Darts and Pool.',
};

async function getData() {
  const { data: tournaments } = await supabase
    .from('day_tournaments')
    .select('*')
    .order('created_at', { ascending: false });
  return { tournaments: (tournaments as DayTournament[]) || [] };
}

function statusBadge(status: DayTournament['status']) {
  switch (status) {
    case 'active':
      return <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400 bg-violet-950/50 px-2 py-0.5 rounded-full">Active</span>;
    case 'completed':
      return <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-charcoal-800 px-2 py-0.5 rounded-full">Completed</span>;
    case 'paired':
      return <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded-full">Teams Paired</span>;
    default:
      return <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded-full">Setup</span>;
  }
}

export default async function TournamentHomePage() {
  const { tournaments } = await getData();

  return (
    <div className="min-h-screen bg-charcoal-950">
      <header className="relative min-h-[45vh] flex items-end overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/hero.jpg')" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-950/60 to-violet-950/40" />
        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 pb-12 pt-24">
          <Link href="/" className="inline-block text-xs font-bold text-gray-300 hover:text-white bg-black/30 px-3 py-1.5 rounded-full mb-6 transition-colors">
            ← MP Mess Home
          </Link>
          <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tight leading-none drop-shadow-lg">MP Mess</h1>
          <h2 className="text-4xl sm:text-6xl font-black text-violet-400 tracking-tight leading-none drop-shadow-lg">1-Day Tournament</h2>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link href="/darts" className="inline-flex items-center gap-2 text-sm font-bold text-amber-300 hover:text-amber-200 bg-amber-950/60 border border-amber-800/50 px-4 py-2 rounded-full transition-colors">
              🎯 MP Mess Darts
            </Link>
            <Link href="/pool" className="inline-flex items-center gap-2 text-sm font-bold text-sky-300 hover:text-sky-200 bg-sky-950/60 border border-sky-800/50 px-4 py-2 rounded-full transition-colors">
              🎱 MP Mess Pool
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="p-4 bg-gradient-to-r from-violet-950 to-charcoal-900 border border-violet-800/40 rounded-xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-2 h-5 bg-violet-400 rounded-sm inline-block"></span>
            🏆 One-Day Knockouts
          </h2>
        </div>

        {tournaments.length === 0 ? (
          <p className="text-gray-500 text-center py-10">No tournaments yet — check back soon.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/tournament/${t.id}`}
                className="bg-charcoal-900 border border-violet-950/60 rounded-xl p-4 flex items-center justify-between gap-3 shadow-md hover:bg-charcoal-800 transition-colors"
              >
                <div>
                  <p className="text-base font-bold text-white">{t.name}</p>
                  <p className="text-xs text-gray-500 mt-1 capitalize">
                    {t.sport === 'pool' ? '🎱' : '🎯'} {t.sport} · {t.mode} · Knockout
                  </p>
                </div>
                {statusBadge(t.status)}
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-violet-900/20 mt-12 py-6 text-center text-xs text-gray-600">
        <p>MP Mess &copy; {new Date().getFullYear()}. All rights reserved.</p>
      </footer>
    </div>
  );
}
