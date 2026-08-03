-- ============================================================
-- MABB Registration — ADD-ON: walkover fines & appeals
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- (Safe to run on your existing project - it only adds things.)
-- ============================================================

create table public.charges (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('walkover', 'appeal')),
  -- walkover: the match, e.g. 'Athlone v Portlaoise'
  -- appeal:   the team name
  description text not null,
  -- walkover: the division, e.g. 'U15 Boys'
  -- appeal:   the appeal reason
  detail text not null default '',
  charge_date date,
  amount numeric(8,2) not null default 0,
  created_at timestamptz not null default now()
);

create index charges_club_idx on public.charges (club_id);

alter table public.charges enable row level security;

-- Admins manage all charges; clubs can only read their own.
-- Clubs can never add, change, or remove a charge.
create policy charges_admin on public.charges for all
  using (is_admin()) with check (is_admin());

create policy charges_club_read on public.charges for select
  using (club_id = auth.uid());
