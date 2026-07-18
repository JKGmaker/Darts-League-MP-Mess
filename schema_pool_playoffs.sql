-- ==============================================================================
-- MP MESS POOL - LEAGUE PLAYOFFS MIGRATION
-- Run this AFTER schema_pool.sql, inside the Supabase SQL Editor.
-- Safe to re-run (idempotent).
--
-- Adds an automatic top-8 seeded knockout playoff stage to league-format
-- pool tournaments, once a configured number of weeks have been completed.
-- Fully additive — doesn't touch darts, or existing pool data.
-- ==============================================================================

-- Distinguishes regular league weeks from the playoff bracket within the
-- same tournament, so standings calculations only ever look at 'league'
-- rounds and never get skewed by knockout results.
alter table public.pool_rounds
  add column if not exists stage text not null default 'league' check (stage in ('league', 'playoff'));

-- Stable slot identifier (QF1, QF2, QF3, QF4, SF1, SF2, F) for playoff-stage
-- fixtures only, so Semi-Final/Final pairings can be built correctly
-- (winner of QF1 vs winner of QF4, etc — proper seeded bracket structure,
-- not just "whoever happened to win, randomly repaired").
alter table public.pool_fixtures
  add column if not exists slot_code text;

-- How many completed league weeks trigger auto-generating the playoff
-- bracket (null = playoffs disabled for this tournament), plus a flag so it
-- only gets generated once.
alter table public.pool_tournaments
  add column if not exists playoff_after_weeks int,
  add column if not exists playoffs_generated boolean not null default false;
