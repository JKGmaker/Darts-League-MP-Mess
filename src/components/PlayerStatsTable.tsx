'use client';

import React from 'react';
import { PlayerStat } from '@/types';

interface PlayerStatsTableProps {
  stats: PlayerStat[];
}

export default function PlayerStatsTable({ stats }: PlayerStatsTableProps) {
  const [sortKey, setSortKey] = React.useState<keyof PlayerStat>('three_dart_average');
  const [sortDir, setSortDir] = React.useState<'desc' | 'asc'>('desc');

  const sorted = [...stats].sort((a, b) => {
    const aVal = a[sortKey] as number;
    const bVal = b[sortKey] as number;
    return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const handleSort = (key: keyof PlayerStat) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortBtn = ({ label, colKey }: { label: string; colKey: keyof PlayerStat }) => (
    <button
      onClick={() => handleSort(colKey)}
      className={`text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
        sortKey === colKey ? 'text-amber-400' : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {label} {sortKey === colKey ? (sortDir === 'desc' ? '↓' : '↑') : ''}
    </button>
  );

  if (stats.length === 0) {
    return (
      <p className="text-gray-500 text-center py-10">
        No stats yet — play some games using the counter to start building stats.
      </p>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="border-b border-emerald-900/30">
            <th className="text-left py-3 px-3 text-xs font-bold uppercase tracking-wider text-gray-500">Player</th>
            <th className="py-3 px-3 text-center"><SortBtn label="Games" colKey="games_played" /></th>
            <th className="py-3 px-3 text-center"><SortBtn label="Legs W" colKey="legs_won" /></th>
            <th className="py-3 px-3 text-center"><SortBtn label="Avg" colKey="three_dart_average" /></th>
            <th className="py-3 px-3 text-center"><SortBtn label="Checkout %" colKey="checkout_percentage" /></th>
            <th className="py-3 px-3 text-center"><SortBtn label="High CO" colKey="highest_checkout" /></th>
            <th className="py-3 px-3 text-center"><SortBtn label="Best Visit" colKey="highest_visit" /></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, idx) => (
            <tr
              key={s.player_id}
              className={`border-b border-charcoal-800 transition-colors hover:bg-charcoal-900/40 ${
                idx === 0 ? 'bg-emerald-950/20' : ''
              }`}
            >
              <td className="py-3 px-3">
                <div className="flex items-center gap-2">
                  {idx === 0 && <span className="text-amber-400 text-xs">🏆</span>}
                  <span className="font-bold text-white">{s.player_name}</span>
                </div>
              </td>
              <td className="py-3 px-3 text-center text-gray-400 tabular-nums">{s.games_played}</td>
              <td className="py-3 px-3 text-center text-gray-400 tabular-nums">{s.legs_won}</td>
              <td className="py-3 px-3 text-center font-bold tabular-nums">
                <span
                  className={
                    Number(s.three_dart_average) >= 80
                      ? 'text-amber-400'
                      : Number(s.three_dart_average) >= 50
                      ? 'text-emerald-400'
                      : 'text-gray-300'
                  }
                >
                  {Number(s.three_dart_average).toFixed(2)}
                </span>
              </td>
              <td className="py-3 px-3 text-center text-gray-300 tabular-nums">
                {s.checkout_percentage}%
                <span className="text-gray-600 text-xs ml-1">
                  ({s.checkouts_hit}/{s.checkout_attempts})
                </span>
              </td>
              <td className="py-3 px-3 text-center text-gray-300 tabular-nums">{s.highest_checkout || '—'}</td>
              <td className="py-3 px-3 text-center text-gray-300 tabular-nums">{s.highest_visit || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
