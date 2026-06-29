'use client';

import React, { useState } from 'react';
import { Player } from '@/types';
import DartScorer from './DartScorer';

interface ScoreButtonProps {
  players: Player[];
}

export default function ScoreButton({ players }: ScoreButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex justify-center">
        <button
          onClick={() => setOpen(true)}
          className="group relative flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xl rounded-2xl transition-all duration-200 shadow-lg shadow-emerald-900/40 hover:shadow-emerald-800/50 hover:scale-105 active:scale-100"
        >
          <span className="text-2xl group-hover:animate-bounce">🎯</span>
          <span className="tracking-wide">Score a Game</span>
        </button>
      </div>

      {open && (
        <DartScorer
          players={players}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
