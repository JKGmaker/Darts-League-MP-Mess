'use client';

import React from 'react';
import { PoolStandingsRow } from '@/types';

interface PoolStandingsTableProps {
  standings: PoolStandingsRow[];
}

export default function PoolStandingsTable({ standings }: PoolStandingsTableProps) {
  return (
    <div className="w-full bg-charcoal-900 rounded-xl border border-sky-800/40 shadow-xl overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-sky-950 to-charcoal-900 border-b border-sky-800/40">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="w-2 h-5 bg-sky-400 rounded-sm inline-block"></span>
          Standings
        </h2>
      </div>
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full min-w-[700px] text-left border-collapse text-sm">
          <thead>
            <tr className="bg-charcoal-950 text-sky-400 font-semibold border-b border-sky-900/50 sticky top-0">
              <th className="py-3 px-4 text-center w-12">Pos</th>
              <th className="py-3 px-4">Player</th>
              <th className="py-3 px-3 text-center">P</th>
              <th className="py-3 px-3 text-center text-sky-300">W</th>
              <th className="py-3 px-3 text-center text-rose-400">L</th>
              <th className="py-3 px-3 text-center">FF</th>
              <th className="py-3 px-3 text-center">FA</th>
              <th className="py-3 px-3 text-center">+/-</th>
              <th className="py-3 px-4 text-center text-sky-300 font-bold bg-sky-950/20">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-950/40 text-gray-200">
            {standings.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-gray-500">
                  No entries yet.
                </td>
              </tr>
            ) : (
              standings.map((row, index) => {
                const isTopThree = index < 3;
                return (
                  <tr
                    key={row.playerId}
                    className={`hover:bg-sky-950/20 transition-colors ${
                      index % 2 === 0 ? 'bg-charcoal-900/40' : 'bg-charcoal-950/20'
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center font-bold">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                          index === 0
                            ? 'bg-sky-400 text-charcoal-950 shadow-md shadow-sky-500/20'
                            : index === 1
                            ? 'bg-slate-300 text-charcoal-950'
                            : index === 2
                            ? 'bg-sky-700 text-white'
                            : 'text-gray-400'
                        }`}
                      >
                        {row.position}
                      </span>
                    </td>
                    <td className={`py-3.5 px-4 font-medium ${isTopThree ? 'text-white' : 'text-gray-300'}`}>
                      {row.name}
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono">{row.played}</td>
                    <td className="py-3.5 px-3 text-center font-mono text-sky-400 font-semibold">{row.won}</td>
                    <td className="py-3.5 px-3 text-center font-mono text-gray-400">{row.lost}</td>
                    <td className="py-3.5 px-3 text-center font-mono text-gray-400">{row.framesWon}</td>
                    <td className="py-3.5 px-3 text-center font-mono text-gray-400">{row.framesLost}</td>
                    <td
                      className={`py-3.5 px-3 text-center font-mono font-semibold ${
                        row.frameDifference > 0
                          ? 'text-sky-400'
                          : row.frameDifference < 0
                          ? 'text-rose-400'
                          : 'text-gray-400'
                      }`}
                    >
                      {row.frameDifference > 0 ? `+${row.frameDifference}` : row.frameDifference}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-base text-sky-300 bg-sky-950/10">
                      {row.points}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
