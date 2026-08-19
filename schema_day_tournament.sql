-- ==============================================================================
-- MP MESS — ONE-DAY TOURNAMENT MODULE
-- Run this AFTER schema.sql and schema_pool.sql, inside the Supabase SQL
-- Editor. This is fully additive — it does not touch players / weeks /
-- fixtures / pool_* tables, so nothing else on the site is affected.
--
-- Powers a one-off, single-day knockout event that can be run for either
-- Darts or Pool, singles or doubles, with an optional "pots" draw so
-- certain entrants can't meet in Round 1 (and, for doubles, so partners get
-- auto-paired one-from-each-pot).
-- ==============================================================================

create extension if not exists "uuid-ossp";

create table public.day_tournaments (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    event_date date,
    sport text not null check (sport in ('darts', 'pool')),
    mode text not null check (mode in ('singles', 'doubles')),
    format text not null default 'knockout' check (format in ('knockout')),
    legs_per_game int not null default 3,
    pot_mode text not null default 'single' check (pot_mode in ('single', 'multiple')),
    pot_count int not null default 1,
    status text not null default 'setup' check (status in ('setup', 'paired', 'active', 'completed')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- One entrant = one person signed up for the day. Stored as a plain name
-- rather than a foreign key into players/pool_players, so the admin can
-- either copy a name in from the existing roster or type in a one-off guest
-- — both end up as ordinary rows here, no special-casing needed downstream.
create table public.day_tournament_entrants (
    id uuid default uuid_generate_v4() primary key,
    tournament_id uuid references public.day_tournaments(id) on delete cascade not null,
    name text not null,
    pot_number int not null default 1,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- A "competitor" is whoever actually occupies a bracket slot: for singles
-- it's a 1:1 copy of an entrant, for doubles it's a paired-up team of two
-- entrants. Fixtures always reference competitors, so the bracket logic
-- doesn't need to know whether this event is singles or doubles.
create table public.day_tournament_competitors (
    id uuid default uuid_generate_v4() primary key,
    tournament_id uuid references public.day_tournaments(id) on delete cascade not null,
    display_name text not null,
    entrant_1_id uuid references public.day_tournament_entrants(id) on delete cascade not null,
    entrant_2_id uuid references public.day_tournament_entrants(id) on delete set null,
    pot_number int, -- carried from entrant_1's pot; used for the Round 1 pot-safe draw in singles events
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- A round of the knockout (Round 1, Quarter-Final, Semi-Final, Final, ...).
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
    competitor_2_id uuid references public.day_tournament_competitors(id) on delete cascade, -- null when is_bye
    competitor_1_legs int default 0 not null,
    competitor_2_legs int default 0 not null,
    completed boolean default false not null,
    is_bye boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.day_tournaments enable row level security;
alter table public.day_tournament_entrants enable row level security;
alter table public.day_tournament_competitors enable row level security;
alter table public.day_tournament_rounds enable row level security;
alter table public.day_tournament_fixtures enable row level security;

-- Public read access
create policy "Allow public read access on day_tournaments" on public.day_tournaments for select using (true);
create policy "Allow public read access on day_tournament_entrants" on public.day_tournament_entrants for select using (true);
create policy "Allow public read access on day_tournament_competitors" on public.day_tournament_competitors for select using (true);
create policy "Allow public read access on day_tournament_rounds" on public.day_tournament_rounds for select using (true);
create policy "Allow public read access on day_tournament_fixtures" on public.day_tournament_fixtures for select using (true);

-- Admin (authenticated) write access — same login as the darts/pool admin.
create policy "Allow admin write access on day_tournaments" on public.day_tournaments for all using (auth.role() = 'authenticated');
create policy "Allow admin write access on day_tournament_entrants" on public.day_tournament_entrants for all using (auth.role() = 'authenticated');
create policy "Allow admin write access on day_tournament_competitors" on public.day_tournament_competitors for all using (auth.role() = 'authenticated');
create policy "Allow admin write access on day_tournament_rounds" on public.day_tournament_rounds for all using (auth.role() = 'authenticated');
create policy "Allow admin write access on day_tournament_fixtures" on public.day_tournament_fixtures for all using (auth.role() = 'authenticated');
