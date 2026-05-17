'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AdminDashboard from '@/components/AdminDashboard';
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
        <AdminDashboard
          initialPlayers={players}
          initialWeeks={weeks}
          initialFixtures={fixtures}
        />
      </div>
    </div>
  );
}
