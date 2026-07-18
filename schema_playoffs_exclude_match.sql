-- ==============================================================================
-- MP MESS DARTS - EXCLUDE MATCH MIGRATION
-- Run this AFTER schema_playoffs.sql, inside the Supabase SQL Editor.
-- Safe to re-run (idempotent).
--
-- Lets you remove a specific bracket match (e.g. a Shield Round 1 game that
-- doesn't exist because the player pool shrank) from both the admin and
-- public bracket views, without touching any other match or seed.
-- ==============================================================================

alter table public.playoff_matches
  add column if not exists excluded boolean default false not null;
