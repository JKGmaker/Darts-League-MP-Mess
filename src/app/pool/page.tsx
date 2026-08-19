import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { PoolTournament } from '@/types';
import PoolRulesModal from '@/components/pool/PoolRulesModal';

export const revalidate = 30;

export const metadata = {
  title: 'MP Mess Pool',
  description: 'Tournaments, fixtures, and results for MP Mess Pool.',
};

async function getData() {
  const { data: tournaments } = await supabase
    .from('pool_tournaments')
    .select('*')
    .order('created_at', { ascending: false });
  return { tournaments: (tournaments as PoolTournament[]) || [] };
}

function statusBadge(status: PoolTournament['status']) {
  switch (status) {
    case 'active':
      return <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400 bg-sky-950/50 px-2 py-0.5 rounded-full">Active</span>;
    case 'completed':
      return <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-charcoal-800 px-2 py-0.5 rounded-full">Completed</span>;
    default:
      return <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded-full">Setup</span>;
  }
}

export default async function PoolHomePage() {
  const { tournaments } = await getData();

  return (
    <div className="min-h-screen bg-charcoal-950">
      <header className="relative min-h-[45vh] flex items-end overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/hero.jpg')" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-950/60 to-sky-950/40" />
        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 pb-12 pt-24">
          <Link href="/" className="inline-block text-xs font-bold text-gray-300 hover:text-white bg-black/30 px-3 py-1.5 rounded-full mb-6 transition-colors">
            ← MP Mess Home
          </Link>
          <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tight leading-none drop-shadow-lg">MP Mess</h1>
          <h2 className="text-4xl sm:text-6xl font-black text-sky-400 tracking-tight leading-none drop-shadow-lg">Pool</h2>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link
              href="/darts"
              className="inline-flex items-center gap-2 text-sm font-bold text-amber-300 hover:text-amber-200 bg-amber-950/60 border border-amber-800/50 px-4 py-2 rounded-full transition-colors"
            >
              🎯 Switch to MP Mess Darts
            </Link>
            <Link
              href="/tournament"
              className="inline-flex items-center gap-2 text-sm font-bold text-emerald-300 hover:text-emerald-200 bg-emerald-950/60 border border-emerald-800/50 px-4 py-2 rounded-full transition-colors"
            >
              🏆 One-Day Tournaments
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="p-4 bg-gradient-to-r from-sky-950 to-charcoal-900 border border-sky-800/40 rounded-xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-2 h-5 bg-sky-400 rounded-sm inline-block"></span>
            Tournaments
          </h2>
        </div>

        {tournaments.length === 0 ? (
          <p className="text-gray-500 text-center py-10">No tournaments yet — check back soon.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/pool/${t.id}`}
                className="bg-charcoal-900 border border-sky-950/60 rounded-xl p-4 flex items-center justify-between gap-3 shadow-md hover:bg-charcoal-800 transition-colors"
              >
                <div>
                  <p className="text-base font-bold text-white">{t.name}</p>
                  <p className="text-xs text-gray-500 mt-1 capitalize">{t.format}</p>
                </div>
                {statusBadge(t.status)}
              </Link>
            ))}
          </div>
        )}

        <PoolRulesModal />
      </main>

      <footer className="border-t border-sky-900/20 mt-12 py-6 text-center text-xs text-gray-600">
        <p>MP Mess Pool &copy; {new Date().getFullYear()}. All rights reserved.</p>
      </footer>
    </div>
  );
}
