import Link from 'next/link';

export const metadata = {
  title: 'MP Mess',
  description: 'MP Mess Darts and MP Mess Pool — league tables, fixtures, and results.',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-charcoal-950 flex flex-col">
      <header className="relative min-h-[45vh] flex items-end overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/hero.jpg')" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-950/70 to-transparent" />
        <div className="relative z-10 w-full max-w-4xl mx-auto px-6 pb-10 pt-24 text-center">
          <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tight leading-none drop-shadow-lg">MP Mess</h1>
          <p className="mt-3 text-sm sm:text-base font-semibold text-gray-300 tracking-wide">Pick your game</p>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        <div className="grid gap-5 sm:grid-cols-3">
          <Link
            href="/darts"
            className="group relative flex flex-col items-center justify-center gap-3 px-6 py-12 rounded-3xl bg-gradient-to-br from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white shadow-xl shadow-amber-950/40 transition-all duration-200 hover:scale-[1.02] active:scale-100"
          >
            <span className="text-6xl group-hover:scale-110 transition-transform">🎯</span>
            <div className="text-center">
              <p className="text-2xl font-black tracking-wide leading-none">MP Mess Darts</p>
              <p className="text-xs font-semibold text-amber-100/90 mt-2">League table · Fixtures · Play-offs</p>
            </div>
          </Link>

          <Link
            href="/pool"
            className="group relative flex flex-col items-center justify-center gap-3 px-6 py-12 rounded-3xl bg-gradient-to-br from-sky-600 to-sky-800 hover:from-sky-500 hover:to-sky-700 text-white shadow-xl shadow-sky-950/40 transition-all duration-200 hover:scale-[1.02] active:scale-100"
          >
            <span className="text-6xl group-hover:scale-110 transition-transform">🎱</span>
            <div className="text-center">
              <p className="text-2xl font-black tracking-wide leading-none">MP Mess Pool</p>
              <p className="text-xs font-semibold text-sky-100/90 mt-2">Tournaments · Knockouts · Leagues</p>
            </div>
          </Link>

          <Link
            href="/tournament"
            className="group relative flex flex-col items-center justify-center gap-3 px-6 py-12 rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-white shadow-xl shadow-emerald-950/40 transition-all duration-200 hover:scale-[1.02] active:scale-100"
          >
            <span className="text-6xl group-hover:scale-110 transition-transform">🏆</span>
            <div className="text-center">
              <p className="text-2xl font-black tracking-wide leading-none">One-Day Tournament</p>
              <p className="text-xs font-semibold text-emerald-100/90 mt-2">Singles · Doubles · Knockouts · Leagues</p>
            </div>
          </Link>
        </div>
      </main>

      <footer className="border-t border-emerald-900/20 py-6 text-center text-xs text-gray-600">
        <p>MP Mess &copy; {new Date().getFullYear()}. All rights reserved.</p>
      </footer>
    </div>
  );
}
