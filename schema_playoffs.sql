-- ==============================================================================
-- MP MESS DARTS LEAGUE - PLAYOFFS + WEEK 10 MIGRATION
-- Run this AFTER the original schema.sql, inside the Supabase SQL Editor.
-- Safe to re-run (idempotent).
-- ==============================================================================

-- 1. Best-of-legs field on every fixture (Week 10 + any league game)
alter table public.fixtures
  add column if not exists best_of int default 5 not null;

-- 2. Single-row settings for the playoffs (lock state + seed snapshot)
create table if not exists public.playoff_settings (
    id int primary key default 1,
    playoffs_locked boolean default false not null,
    seed_snapshot jsonb,                       -- ordered array of player ids by final position
    default_best_of int default 5 not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint single_row check (id = 1)
);

insert into public.playoff_settings (id)
values (1)
on conflict (id) do nothing;

-- 3. Per-match results & admin overrides, keyed by a stable match code
create table if not exists public.playoff_matches (
    id uuid default uuid_generate_v4() primary key,
    bracket text not null,                     -- 'championship' | 'shield'
    code text not null,                        -- stable code e.g. 'CH-QF1', 'SH-R1-1'
    best_of int default 5 not null,
    player_1_score int default 0 not null,
    player_2_score int default 0 not null,
    completed boolean default false not null,
    override_player_1_id uuid references public.players(id) on delete set null,
    override_player_2_id uuid references public.players(id) on delete set null,
    override_winner_id   uuid references public.players(id) on delete set null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (bracket, code)
);

-- 4. Row Level Security
alter table public.playoff_settings enable row level security;
alter table public.playoff_matches enable row level security;

drop policy if exists "Allow public read access on playoff_settings" on public.playoff_settings;
drop policy if exists "Allow public read access on playoff_matches" on public.playoff_matches;
drop policy if exists "Allow admin write access on playoff_settings" on public.playoff_settings;
drop policy if exists "Allow admin write access on playoff_matches" on public.playoff_matches;

create policy "Allow public read access on playoff_settings"
  on public.playoff_settings for select using (true);
create policy "Allow public read access on playoff_matches"
  on public.playoff_matches for select using (true);

create policy "Allow admin write access on playoff_settings"
  on public.playoff_settings for all using (auth.role() = 'authenticated');
create policy "Allow admin write access on playoff_matches"
  on public.playoff_matches for all using (auth.role() = 'authenticated');
