-- ==============================================================================
-- MP MESS ONE-DAY TOURNAMENT - SUPABASE DATABASE SCHEMA
-- Run this AFTER schema.sql (inside the Supabase SQL Editor). This is fully
-- additive — it does not touch players / weeks / fixtures / pool_* tables,
-- so nothing else on the site is affected.
--
-- A one-day tournament can be run for either sport (darts or pool), as
-- singles or doubles, as a league or a knockout. Matches are played between
-- "competitors" — a competitor is a single player (singles) or a paired-up
-- team of two players (doubles). Entrants can optionally be split into
-- "pots" so the draw / doubles pairing keeps certain players apart.
-- ==============================================================================

create extension if not exists "uuid-ossp";

-- Its own roster, separate from the darts and pool player lists — a one-day
-- event often has walk-in / one-off entrants who aren't in either league.
create table public.day_tournament_players (
    id uuid default uuid_generate_v4() primary key,
    name text not null unique,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.day_tournaments (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    event_date date,
    sport text not null check (sport in ('darts', 'pool')),
    entry_type text not null check (entry_type in ('singles', 'doubles')),
    format text not null check (format in ('knockout', 'league')),
    legs_per_game int not null default 3,
    pot_mode text not null default 'single' check (pot_mode in ('single', 'multiple')),
    games_per_competitor int, -- only used for league format
    status text not null default 'setup' check (status in ('setup', 'active', 'completed')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Named pots (e.g. "Pot A" / "Pot B") used to keep certain entrants apart in
-- the draw, or to build balanced doubles pairs (one player from each pot).
create table public.day_tournament_pots (
    id uuid default uuid_generate_v4() primary key,
    tournament_id uuid references public.day_tournaments(id) on delete cascade not null,
    name text not null,
    sequence_order int not null default 1,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Who's entered into a given tournament, and which pot they've been put in.
create table public.day_tournament_entrants (
    id uuid default uuid_generate_v4() primary key,
    tournament_id uuid references public.day_tournaments(id) on delete cascade not null,
    player_id uuid references public.day_tournament_players(id) on delete cascade not null,
    pot_id uuid references public.day_tournament_pots(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (tournament_id, player_id)
);

-- The unit that actually plays fixtures: one player (singles, player_2_id
-- null) or a paired-up doubles team (player_2_id set). For singles these are
-- created 1:1 from entrants when fixtures are generated; for doubles they're
-- created by the "Pair Players" step.
create table public.day_tournament_competitors (
    id uuid default uuid_generate_v4() primary key,
    tournament_id uuid references public.day_tournaments(id) on delete cascade not null,
    player_1_id uuid references public.day_tournament_players(id) on delete cascade not null,
    player_2_id uuid references public.day_tournament_players(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- A "round" is a knockout round (Round 1, Semi-Final, ...) or a league round.
create table public.day_tournament_rounds (
    id uuid default uuid_generate_v4() primary key,
    tournament_id uuid references public.day_tournaments(id) on delete cascade not null,
    name text not null,
    sequence_order int not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.day_tournament_fixtures (
    id uuid default uuid_generate_v4() primary key,
    round_id uuid references public.day_tournament_rounds(id) on delete cascade not null,
    competitor_1_id uuid references public.day_tournament_competitors(id) on delete cascade not null,
    competitor_2_id uuid references public.day_tournament_competitors(id) on delete cascade, -- null when is_bye = true
    competitor_1_score int default 0 not null,
    competitor_2_score int default 0 not null,
    completed boolean default false not null,
    is_bye boolean default false not null,
    best_of int not null default 3,
    slot_code text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.day_tournament_players enable row level security;
alter table public.day_tournaments enable row level security;
alter table public.day_tournament_pots enable row level security;
alter table public.day_tournament_entrants enable row level security;
alter table public.day_tournament_competitors enable row level security;
alter table public.day_tournament_rounds enable row level security;
alter table public.day_tournament_fixtures enable row level security;

-- Public read access
create policy "Allow public read access on day_tournament_players" on public.day_tournament_players for select using (true);
create policy "Allow public read access on day_tournaments" on public.day_tournaments for select using (true);
create policy "Allow public read access on day_tournament_pots" on public.day_tournament_pots for select using (true);
create policy "Allow public read access on day_tournament_entrants" on public.day_tournament_entrants for select using (true);
create policy "Allow public read access on day_tournament_competitors" on public.day_tournament_competitors for select using (true);
create policy "Allow public read access on day_tournament_rounds" on public.day_tournament_rounds for select using (true);
create policy "Allow public read access on day_tournament_fixtures" on public.day_tournament_fixtures for select using (true);

-- Admin (authenticated) write access — same login as the darts/pool admin,
-- no separate account needed.
create policy "Allow admin write access on day_tournament_players" on public.day_tournament_players for all using (auth.role() = 'authenticated');
create policy "Allow admin write access on day_tournaments" on public.day_tournaments for all using (auth.role() = 'authenticated');
create policy "Allow admin write access on day_tournament_pots" on public.day_tournament_pots for all using (auth.role() = 'authenticated');
create policy "Allow admin write access on day_tournament_entrants" on public.day_tournament_entrants for all using (auth.role() = 'authenticated');
create policy "Allow admin write access on day_tournament_competitors" on public.day_tournament_competitors for all using (auth.role() = 'authenticated');
create policy "Allow admin write access on day_tournament_rounds" on public.day_tournament_rounds for all using (auth.role() = 'authenticated');
create policy "Allow admin write access on day_tournament_fixtures" on public.day_tournament_fixtures for all using (auth.role() = 'authenticated');
