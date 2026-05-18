import { supabase } from '@/lib/supabase';
import { PlayerStat } from '@/types';
import PlayerStatsTable from '@/components/PlayerStatsTable';

export const revalidate = 30;

async function getStats(): Promise<PlayerStat[]> {
  const { data, error } = await supabase
    .from('player_stats')
    .select('*')
    .order('three_dart_average', { ascending: false });

  if (error || !data) return [];
  return data as PlayerStat[];
}

export default async function StatsPage() {
  const stats = await getStats();

  const topAvg = stats[0];
  const topCheckout = [...stats].sort(
    (a, b) => Number(b.checkout_percentage) - Number(a.checkout_percentage)
  )[0];
  const topHighest = [...stats].sort((a, b) => b.highest_visit - a.highest_visit)[0];

  return (
    <div className="min-h-screen bg-charcoal-950">
      {/* Header */}
      <div className="bg-charcoal-900 border-b border-emerald-900/30 px-4 py-4 flex items-center justify-between">
        <a href="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ← Back to League
        </a>
        <span className="text-white font-black text-sm tracking-wider">📊 PLAYER STATS</span>
        <div className="w-20" />
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Hero stat cards */}
        {stats.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-charcoal-900 border border-emerald-900/30 rounded-xl p-4 text-center">
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Top Average</p>
              <p className="text-2xl font-black text-amber-400 tabular-nums">
                {Number(topAvg?.three_dart_average || 0).toFixed(2)}
              </p>
              <p className="text-gray-500 text-xs mt-1 truncate">{topAvg?.player_name}</p>
            </div>
            <div className="bg-charcoal-900 border border-emerald-900/30 rounded-xl p-4 text-center">
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Best Checkout %</p>
              <p className="text-2xl font-black text-amber-400 tabular-nums">
                {topCheckout?.checkout_percentage || 0}%
              </p>
              <p className="text-gray-500 text-xs mt-1 truncate">{topCheckout?.player_name}</p>
            </div>
            <div className="bg-charcoal-900 border border-emerald-900/30 rounded-xl p-4 text-center">
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Highest Visit</p>
              <p className="text-2xl font-black text-amber-400 tabular-nums">
                {topHighest?.highest_visit || 0}
              </p>
              <p className="text-gray-500 text-xs mt-1 truncate">{topHighest?.player_name}</p>
            </div>
          </div>
        )}

        {/* Main stats table */}
        <div className="bg-charcoal-900 border border-emerald-900/30 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-emerald-900/20">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-5 bg-amber-500 rounded-sm inline-block"></span>
              Season Statistics
            </h2>
            <p className="text-gray-600 text-xs mt-1">
              Updated after every game · Tap column headers to sort
            </p>
          </div>
          <div className="p-2">
            <PlayerStatsTable stats={stats} />
          </div>
        </div>

        {/* Stats explanation */}
        <div className="bg-charcoal-900/50 border border-charcoal-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">How Stats Work</h3>
          <div className="grid sm:grid-cols-2 gap-3 text-xs text-gray-500">
            <div>
              <span className="text-gray-300 font-semibold">3-Dart Average</span> — Total score thrown divided by total darts, multiplied by 3. The standard measure of dart-playing ability.
            </div>
            <div>
              <span className="text-gray-300 font-semibold">Checkout %</span> — Percentage of visits converted when the player had 170 or under remaining. Only counted when the counter is used.
            </div>
            <div>
              <span className="text-gray-300 font-semibold">Highest Checkout</span> — The highest score finished on (e.g. 170 = T20, T20, Bull).
            </div>
            <div>
              <span className="text-gray-300 font-semibold">Best Visit</span> — The highest single visit score (maximum 180 = three T20s).
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-emerald-900/20 mt-12 py-6 text-center text-xs text-gray-600">
        <p>MP Mess Darts League © {new Date().getFullYear()}. All rights reserved.</p>
      </footer>
    </div>
  );
}
