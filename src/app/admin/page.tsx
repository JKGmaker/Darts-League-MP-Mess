import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import AdminDashboard from '@/components/AdminDashboard';
import { Player, Week, Fixture } from '@/types';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = createServerComponentClient({ cookies });

  // Auth guard — redirect to login if not authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Fetch all data server-side
  const [{ data: players }, { data: weeks }, { data: fixtures }] = await Promise.all([
    supabase.from('players').select('*').order('name'),
    supabase.from('weeks').select('*').order('sequence_order'),
    supabase.from('fixtures').select('*'),
  ]);

  return (
    <div className="min-h-screen bg-charcoal-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <AdminDashboard
          initialPlayers={(players as Player[]) || []}
          initialWeeks={(weeks as Week[]) || []}
          initialFixtures={(fixtures as Fixture[]) || []}
        />
      </div>
    </div>
  );
}
