'use client';

import React from 'react';
import { StandingsRow } from '@/types';

interface LeagueTableProps {
  standings: StandingsRow[];
}

export default function LeagueTable({ standings }: LeagueTableProps) {
  return (
    <div className="w-full bg-charcoal-900 rounded-xl border border-emerald-800/40 shadow-xl overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-emerald-950 to-charcoal-900 border-b border-emerald-800/40">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="w-2 h-5 bg-amber-500 rounded-sm inline-block"></span>
          League Standings
        </h2>
      </div>
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full min-w-[700px] text-left border-collapse text-sm">
          <thead>
            <tr className="bg-charcoal-950 text-emerald-400 font-semibold border-b border-emerald-900/50 sticky top-0">
              <th className="py-3 px-4 text-center w-12">Pos</th>
              <th className="py-3 px-4">Player</th>
              <th className="py-3 px-3 text-center">P</th>
              <th className="py-3 px-3 text-center text-emerald-300">W</th>
              <th className="py-3 px-3 text-center text-rose-400">L</th>
              <th className="py-3 px-3 text-center">LF</th>
              <th className="py-3 px-3 text-center">LA</th>
              <th className="py-3 px-3 text-center">+/-</th>
              <th className="py-3 px-4 text-center text-amber-400 font-bold bg-emerald-950/20">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-950/40 text-gray-200">
            {standings.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-gray-500">
                  No active league entries or players found.
                </td>
              </tr>
            ) : (
              standings.map((row, index) => {
                const isTopThree = index < 3;
                return (
                  <tr
                    key={row.playerId}
                    className={`hover:bg-emerald-950/20 transition-colors ${
                      index % 2 === 0 ? 'bg-charcoal-900/40' : 'bg-charcoal-950/20'
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center font-bold">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                          index === 0
                            ? 'bg-amber-500 text-charcoal-950 shadow-md shadow-amber-500/20'
                            : index === 1
                            ? 'bg-slate-300 text-charcoal-950'
                            : index === 2
                            ? 'bg-amber-700 text-white'
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
                    <td className="py-3.5 px-3 text-center font-mono text-emerald-400 font-semibold">{row.won}</td>
                    <td className="py-3.5 px-3 text-center font-mono text-gray-400">{row.lost}</td>
                    <td className="py-3.5 px-3 text-center font-mono text-gray-400">{row.legsWon}</td>
                    <td className="py-3.5 px-3 text-center font-mono text-gray-400">{row.legsLost}</td>
                    <td
                      className={`py-3.5 px-3 text-center font-mono font-semibold ${
                        row.legDifference > 0
                          ? 'text-emerald-400'
                          : row.legDifference < 0
                          ? 'text-rose-400'
                          : 'text-gray-400'
                      }`}
                    >
                      {row.legDifference > 0 ? `+${row.legDifference}` : row.legDifference}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-base text-amber-400 bg-emerald-950/10">
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
