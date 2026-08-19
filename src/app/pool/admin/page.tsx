'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import PoolAdminDashboard from '@/components/pool/PoolAdminDashboard';
import { PoolPlayer, PoolTournament } from '@/types';

export default function PoolAdminPage() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [players, setPlayers] = useState<PoolPlayer[]>([]);
  const [tournaments, setTournaments] = useState<PoolTournament[]>([]);

  useEffect(() => {
    const init = async () => {
      await new Promise((r) => setTimeout(r, 500));

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        window.location.replace('/login?redirect=/pool/admin');
        return;
      }

      setAuthed(true);

      const [{ data: p }, { data: t }] = await Promise.all([
        supabase.from('pool_players').select('*').order('name'),
        supabase.from('pool_tournaments').select('*').order('created_at', { ascending: false }),
      ]);

      setPlayers(p || []);
      setTournaments(t || []);
      setLoading(false);
    };

    init();
  }, []);

  if (loading || !authed) {
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center">
        <p className="text-sky-400 text-sm font-medium animate-pulse">Loading Pool Admin...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-wrap justify-end gap-2 mb-4">
          <a href="/admin" className="px-4 py-2 bg-amber-950/60 border border-amber-800/50 hover:bg-amber-900/60 text-amber-300 text-xs font-bold rounded-lg transition-all">
            🎯 Darts Admin
          </a>
          <a href="/tournament/admin" className="px-4 py-2 bg-violet-950/60 border border-violet-800/50 hover:bg-violet-900/60 text-violet-300 text-xs font-bold rounded-lg transition-all">
            🏆 1-Day Tournament Admin
          </a>
        </div>
        <PoolAdminDashboard initialPlayers={players} initialTournaments={tournaments} />
      </div>
    </div>
  );
}
