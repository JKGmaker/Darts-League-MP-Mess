-- ==============================================================================
-- MP MESS POOL - SUPABASE DATABASE SCHEMA
-- Run this AFTER schema.sql and schema_playoffs.sql, inside the Supabase SQL
-- Editor. This is fully additive — it does not touch players / weeks /
-- fixtures / playoff_settings / playoff_matches, so nothing on the darts
-- side is affected.
-- ==============================================================================

create extension if not exists "uuid-ossp";

-- Pool players are a separate roster from darts players (some people may
-- play both, some may not — kept independent on purpose).
create table public.pool_players (
    id uuid default uuid_generate_v4() primary key,
    name text not null unique,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- One row per tournament. format drives which UI/generator the admin panel
-- and public page use: 'league' (round robin, standings table) or
-- 'knockout' (bracket, single elimination).
create table public.pool_tournaments (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    format text not null check (format in ('league', 'knockout')),
    status text not null default 'setup' check (status in ('setup', 'active', 'completed')),
    games_per_player int, -- only used for league format
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Which players are entered into a given tournament.
create table public.pool_tournament_players (
    tournament_id uuid references public.pool_tournaments(id) on delete cascade not null,
    player_id uuid references public.pool_players(id) on delete cascade not null,
    primary key (tournament_id, player_id)
);

-- A "round" is a Week (league format) or a knockout round (Round 1,
-- Quarter-Final, etc). Both formats just group fixtures under a round.
create table public.pool_rounds (
    id uuid default uuid_generate_v4() primary key,
    tournament_id uuid references public.pool_tournaments(id) on delete cascade not null,
    name text not null,
    sequence_order int not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.pool_fixtures (
    id uuid default uuid_generate_v4() primary key,
    round_id uuid references public.pool_rounds(id) on delete cascade not null,
    player_1_id uuid references public.pool_players(id) on delete cascade not null,
    player_2_id uuid references public.pool_players(id) on delete cascade, -- null when is_bye = true
    player_1_score int default 0 not null,
    player_2_score int default 0 not null,
    completed boolean default false not null,
    is_bye boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.pool_players enable row level security;
alter table public.pool_tournaments enable row level security;
alter table public.pool_tournament_players enable row level security;
alter table public.pool_rounds enable row level security;
alter table public.pool_fixtures enable row level security;

-- Public read access
create policy "Allow public read access on pool_players" on public.pool_players for select using (true);
create policy "Allow public read access on pool_tournaments" on public.pool_tournaments for select using (true);
create policy "Allow public read access on pool_tournament_players" on public.pool_tournament_players for select using (true);
create policy "Allow public read access on pool_rounds" on public.pool_rounds for select using (true);
create policy "Allow public read access on pool_fixtures" on public.pool_fixtures for select using (true);

-- Admin (authenticated) write access — same login as the darts admin, no
-- separate account needed.
create policy "Allow admin write access on pool_players" on public.pool_players for all using (auth.role() = 'authenticated');
create policy "Allow admin write access on pool_tournaments" on public.pool_tournaments for all using (auth.role() = 'authenticated');
create policy "Allow admin write access on pool_tournament_players" on public.pool_tournament_players for all using (auth.role() = 'authenticated');
create policy "Allow admin write access on pool_rounds" on public.pool_rounds for all using (auth.role() = 'authenticated');
create policy "Allow admin write access on pool_fixtures" on public.pool_fixtures for all using (auth.role() = 'authenticated');
