-- ==============================================================================
-- MP MESS POOL - DEFAULTS FIX (only needed if you hit "null value in column
-- player_1_score violates not-null constraint"). Safe to re-run.
-- Run this in the Supabase SQL Editor if you already ran schema_pool.sql once.
-- ==============================================================================

alter table public.pool_fixtures
  alter column player_1_score set default 0;

alter table public.pool_fixtures
  alter column player_2_score set default 0;

-- Backfill any existing rows that ended up with nulls before this fix.
update public.pool_fixtures set player_1_score = 0 where player_1_score is null;
update public.pool_fixtures set player_2_score = 0 where player_2_score is null;
