'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AdminDashboard from '@/components/AdminDashboard';
import PlayoffsAdmin from '@/components/PlayoffsAdmin';
import { Player, Week, Fixture } from '@/types';

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);

  useEffect(() => {
    const init = async () => {
      // Give Supabase a moment to restore session from storage
      await new Promise((r) => setTimeout(r, 500));

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        window.location.replace('/login');
        return;
      }

      setAuthed(true);

      const [{ data: p }, { data: w }, { data: f }] = await Promise.all([
        supabase.from('players').select('*').order('name'),
        supabase.from('weeks').select('*').order('sequence_order'),
        supabase.from('fixtures').select('*'),
      ]);

      setPlayers(p || []);
      setWeeks(w || []);
      setFixtures(f || []);
      setLoading(false);
    };

    init();
  }, []);

  if (loading || !authed) {
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center">
        <p className="text-emerald-400 text-sm font-medium animate-pulse">Loading League HQ...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-wrap justify-end gap-2 mb-4">
          <a href="/pool/admin" className="px-4 py-2 bg-sky-950/60 border border-sky-800/50 hover:bg-sky-900/60 text-sky-300 text-xs font-bold rounded-lg transition-all">
            Pool Admin
          </a>
          <a href="/tournament/admin" className="px-4 py-2 bg-emerald-950/60 border border-emerald-800/50 hover:bg-emerald-900/60 text-emerald-300 text-xs font-bold rounded-lg transition-all">
            One-Day Tournament Admin
          </a>
        </div>
        <AdminDashboard
          initialPlayers={players}
          initialWeeks={weeks}
          initialFixtures={fixtures}
        />
        <div className="mt-10 pt-8 border-t border-emerald-900/30">
          <PlayoffsAdmin
            initialPlayers={players}
            initialWeeks={weeks}
            initialFixtures={fixtures}
          />
        </div>
      </div>
    </div>
  );
}
