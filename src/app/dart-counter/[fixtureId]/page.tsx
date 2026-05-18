'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DartCounter from '@/components/DartCounter';
import { Fixture, Player, Leg, Visit } from '@/types';

export default function DartCounterPage() {
  const params = useParams();
  const fixtureId = params.fixtureId as string;

  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [player1, setPlayer1] = useState<Player | null>(null);
  const [player2, setPlayer2] = useState<Player | null>(null);
  const [legs, setLegs] = useState<Leg[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      // Allow session to restore
      await new Promise((r) => setTimeout(r, 500));

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.replace(`/login?redirect=/dart-counter/${fixtureId}`);
        return;
      }

      setAuthed(true);

      // Load fixture
      const { data: fixtureData, error: fixtureError } = await supabase
        .from('fixtures')
        .select('*')
        .eq('id', fixtureId)
        .single();

      if (fixtureError || !fixtureData) {
        setError('Fixture not found.');
        setLoading(false);
        return;
      }

      if (fixtureData.completed) {
        setError('This fixture is already completed.');
        setLoading(false);
        setFixture(fixtureData);
        return;
      }

      setFixture(fixtureData);

      // Load players
      const [{ data: p1Data }, { data: p2Data }] = await Promise.all([
        supabase.from('players').select('*').eq('id', fixtureData.player_1_id).single(),
        supabase.from('players').select('*').eq('id', fixtureData.player_2_id).single(),
      ]);

      if (!p1Data || !p2Data) {
        setError('Could not load player data.');
        setLoading(false);
        return;
      }

      setPlayer1(p1Data);
      setPlayer2(p2Data);

      // Load existing legs and visits for this fixture
      const { data: legsData } = await supabase
        .from('legs')
        .select('*')
        .eq('fixture_id', fixtureId)
        .order('leg_number');

      const legIds = (legsData || []).map((l: Leg) => l.id);
      let visitsData: Visit[] = [];

      if (legIds.length > 0) {
        const { data: vData } = await supabase
          .from('visits')
          .select('*')
          .in('leg_id', legIds)
          .order('created_at');
        visitsData = vData || [];
      }

      setLegs(legsData || []);
      setVisits(visitsData);
      setLoading(false);
    };

    init();
  }, [fixtureId]);

  if (loading || !authed) {
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center">
        <p className="text-emerald-400 text-sm font-medium animate-pulse">Loading scorer...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-charcoal-950 flex flex-col items-center justify-center gap-4 px-4">
        <span className="text-4xl">🎯</span>
        <p className="text-rose-400 font-semibold text-center">{error}</p>
        {fixture?.completed && (
          <a
            href={`/stats?fixture=${fixtureId}`}
            className="px-6 py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all"
          >
            📊 View Match Stats
          </a>
        )}
        <a href="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ← Back to League
        </a>
      </div>
    );
  }

  if (!fixture || !player1 || !player2) return null;

  return (
    <DartCounter
      fixture={fixture}
      player1={player1}
      player2={player2}
      initialLegs={legs}
      initialVisits={visits}
    />
  );
}
