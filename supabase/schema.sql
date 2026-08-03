-- ============================================================
-- MABB Registration 2026/27 - database schema
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run
-- ============================================================

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'club' check (role in ('admin','club')),
  club_name text not null
);

-- Single row holding the registration deadlines
create table settings (
  id int primary key default 1 check (id = 1),
  juvenile_deadline timestamptz not null default now() + interval '90 days',
  senior_deadline   timestamptz not null default now() + interval '90 days',
  fees jsonb not null default '{
    "youth":  { "player": 12, "playUp": 2,  "team": 35, "slots": 25, "puSlots": 20 },
    "senior": { "player": 20, "playUp": 15, "team": 75, "slots": 24, "puSlots": 0 },
    "coach": 20, "cup": 100, "juvenile": 50, "seniorOne": 60, "seniorMulti": 100,
    "coachSlots": 50
  }'::jsonb
);
insert into settings (id) values (1);

create table players (
  id bigint generated always as identity primary key,
  club_id uuid not null references profiles(id) on delete cascade,
  sheet text not null,                                   -- e.g. 'Under 12 Boys', 'Senior Men'
  team int not null check (team between 1 and 4),
  section text not null check (section in ('main','playup')),
  slot int not null,
  name text not null default '',
  bipin text not null default '',
  dob date,
  category text not null check (category in ('juvenile','senior')),
  updated_at timestamptz not null default now(),
  unique (club_id, sheet, team, section, slot),
  -- The database verifies the category matches the sheet, so a club
  -- cannot label a senior player 'juvenile' to dodge the senior deadline
  constraint category_matches_sheet
    check ((sheet in ('Senior Men','Senior Ladies')) = (category = 'senior'))
);

create table coaches (
  id bigint generated always as identity primary key,
  club_id uuid not null references profiles(id) on delete cascade,
  slot int not null,
  name text not null default '',
  bipin text not null default '',
  dob date,
  updated_at timestamptz not null default now(),
  unique (club_id, slot)
);

-- Helper: is the current user an admin?
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

-- Helper: deadline check per category. Open only BEFORE the deadline.
create or replace function category_open(cat text) returns boolean
language sql stable security definer set search_path = public as
$$ select now() < (select case when cat = 'senior' then senior_deadline
                               else juvenile_deadline end
                   from settings where id = 1) $$;

-- Coaches stay editable until the LATER of the two deadlines
create or replace function coaches_open() returns boolean
language sql stable security definer set search_path = public as
$$ select now() < (select greatest(juvenile_deadline, senior_deadline) from settings where id = 1) $$;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table profiles enable row level security;
alter table settings enable row level security;
alter table players  enable row level security;
alter table coaches  enable row level security;

create policy profiles_read on profiles for select
  using (id = auth.uid() or is_admin());

create policy settings_read   on settings for select using (auth.uid() is not null);
create policy settings_update on settings for update using (is_admin());

create policy players_admin on players for all
  using (is_admin()) with check (is_admin());

-- Clubs can read their own roster any time (even after deadline)
create policy players_club_read on players for select
  using (club_id = auth.uid());

-- Clubs can add/edit/remove ONLY before that category's deadline.
-- Enforced by the database itself - cannot be bypassed from the browser.
create policy players_club_insert on players for insert
  with check (club_id = auth.uid() and category_open(category));
create policy players_club_update on players for update
  using (club_id = auth.uid() and category_open(category))
  with check (club_id = auth.uid() and category_open(category));
create policy players_club_delete on players for delete
  using (club_id = auth.uid() and category_open(category));

create policy coaches_admin on coaches for all
  using (is_admin()) with check (is_admin());
create policy coaches_club_read on coaches for select
  using (club_id = auth.uid());
create policy coaches_club_insert on coaches for insert
  with check (club_id = auth.uid() and coaches_open());
create policy coaches_club_update on coaches for update
  using (club_id = auth.uid() and coaches_open())
  with check (club_id = auth.uid() and coaches_open());
create policy coaches_club_delete on coaches for delete
  using (club_id = auth.uid() and coaches_open());

-- ============================================================
-- AFTER RUNNING THIS FILE: create your admin login
-- 1. Supabase Dashboard -> Authentication -> Users -> Add user
--    (enter your email + password, tick auto-confirm)
-- 2. Copy the new user's UUID, then run:
--    insert into profiles (id, role, club_name)
--    values ('PASTE-UUID-HERE', 'admin', 'MABB Admin');
-- ============================================================
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
