import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Player, Fixture, PlayoffSettings, PlayoffMatchRow, Bracket } from '@/types';
import { resolveBracket, bracketChampion, BRACKET_META } from '@/lib/playoffs';
import BracketView from '@/components/BracketView';

export const revalidate = 30;

const VALID: Bracket[] = ['championship', 'shield'];

async function getData() {
  const [{ data: players }, { data: fixtures }, { data: settings }, { data: matches }] = await Promise.all([
    supabase.from('players').select('*').order('name'),
    supabase.from('fixtures').select('*'),
    supabase.from('playoff_settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('playoff_matches').select('*'),
  ]);
  return {
    players: (players as Player[]) || [],
    fixtures: (fixtures as Fixture[]) || [],
    settings: (settings as PlayoffSettings) || null,
    matches: (matches as PlayoffMatchRow[]) || [],
  };
}

export default async function PlayoffPage({ params }: { params: { bracket: string } }) {
  const bracket = params.bracket as Bracket;
  if (!VALID.includes(bracket)) notFound();

  const { players, fixtures, settings, matches } = await getData();
  const resolved = resolveBracket(bracket, players, fixtures, settings, matches);
  const champion = bracketChampion(resolved);
  const meta = BRACKET_META[bracket];
  const locked = !!settings?.playoffs_locked;
  const isChampionship = bracket === 'championship';

  return (
    <div className="min-h-screen bg-charcoal-950">
      <header className={`relative overflow-hidden border-b ${isChampionship ? 'border-amber-700/30' : 'border-emerald-700/30'}`}>
        <div className={`absolute inset-0 ${isChampionship ? 'bg-gradient-to-br from-amber-900/30 via-charcoal-950 to-charcoal-950' : 'bg-gradient-to-br from-emerald-900/30 via-charcoal-950 to-charcoal-950'}`} />
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">
          <Link href="/darts" className="text-xs font-semibold text-gray-400 hover:text-white transition-colors">
            ← Back to League
          </Link>
          <div className="mt-4 flex items-end gap-3">
            <span className="text-4xl">{isChampionship ? '🏆' : '🛡️'}</span>
            <div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none">{meta.title}</h1>
              <p className={`mt-1 text-sm font-bold ${isChampionship ? 'text-amber-400' : 'text-emerald-400'}`}>
                Play-offs · {meta.seedRange}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {champion && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400">{meta.title} Winner</p>
            <p className="mt-1 text-2xl font-black text-white">🎉 {champion.name}</p>
          </div>
        )}

        <p className="text-sm text-gray-400 leading-relaxed">{meta.note}</p>

        <BracketView bracket={bracket} matches={resolved} locked={locked} />

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href={`/playoffs/${isChampionship ? 'shield' : 'championship'}`}
            className="px-5 py-2.5 rounded-lg text-sm font-bold bg-charcoal-900 border border-emerald-900/40 text-gray-200 hover:bg-charcoal-800 transition-colors"
          >
            View {isChampionship ? 'Shield' : 'Championship'} →
          </Link>
          <Link
            href="/darts"
            className="px-5 py-2.5 rounded-lg text-sm font-bold bg-charcoal-900 border border-emerald-900/40 text-gray-200 hover:bg-charcoal-800 transition-colors"
          >
            League Table
          </Link>
        </div>
      </main>

      <footer className="border-t border-emerald-900/20 mt-12 py-6 text-center text-xs text-gray-600">
        <p>MP Mess Darts League &copy; {new Date().getFullYear()}. All rights reserved.</p>
      </footer>
    </div>
  );
}
