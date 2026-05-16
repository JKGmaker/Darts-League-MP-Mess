'use client';

export default function HeroImage() {
  return (
    <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-emerald-600 shadow-2xl shadow-emerald-900/50 ring-2 ring-amber-500/30">
      <img
        src="/hero.jpg"
        alt="MP Mess Darts League"
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
}
