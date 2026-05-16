-- ==============================================================================
-- MP MESS DARTS LEAGUE - SUPABASE DATABASE SCHEMA
-- Run this script directly inside the Supabase SQL Editor.
-- ==============================================================================

create extension if not exists "uuid-ossp";

create table public.players (
    id uuid default uuid_generate_v4() primary key,
    name text not null unique,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.weeks (
    id uuid default uuid_generate_v4() primary key,
    name text not null unique,
    sequence_order int not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.fixtures (
    id uuid default uuid_generate_v4() primary key,
    week_id uuid references public.weeks(id) on delete cascade not null,
    player_1_id uuid references public.players(id) on delete cascade not null,
    player_2_id uuid references public.players(id) on delete cascade not null,
    player_1_score int default 0,
    player_2_score int default 0,
    completed boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.players enable row level security;
alter table public.weeks enable row level security;
alter table public.fixtures enable row level security;

-- Setup Public Read Access Policies
create policy "Allow public read access on players" on public.players for select using (true);
create policy "Allow public read access on weeks" on public.weeks for select using (true);
create policy "Allow public read access on fixtures" on public.fixtures for select using (true);

-- Setup Protected Admin Write Access Policies
create policy "Allow admin write access on players" on public.players for all using (auth.role() = 'authenticated');
create policy "Allow admin write access on weeks" on public.weeks for all using (auth.role() = 'authenticated');
create policy "Allow admin write access on fixtures" on public.fixtures for all using (auth.role() = 'authenticated');
