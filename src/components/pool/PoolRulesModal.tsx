'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function PoolRulesModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 rounded-xl bg-gradient-to-r from-sky-950 to-charcoal-900 border border-sky-800/40 text-left hover:from-sky-900 transition-colors"
      >
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="w-2 h-5 bg-sky-400 rounded-sm inline-block"></span>
          Rules
        </h2>
        <span className="text-sm font-bold text-sky-400">View House Rules →</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div className="relative max-w-md w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-sky-800/40 bg-charcoal-950 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors text-lg leading-none"
              aria-label="Close"
            >
              ×
            </button>
            <Image
              src="/pool-rules.jpg"
              alt="MP Mess Pool House Rules"
              width={1024}
              height={1536}
              className="w-full h-auto rounded-2xl"
              priority
            />
          </div>
        </div>
      )}
    </>
  );
}
