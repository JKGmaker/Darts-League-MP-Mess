-- Adds an editable "fees" record to the settings table so the admin panel
-- can change every registration fee without a code deploy.
-- Safe to run more than once. Only needed if your database was created
-- before this column was added to schema.sql.

alter table settings add column if not exists fees jsonb;

update settings set fees = '{
  "youth":  { "player": 12, "playUp": 2,  "team": 35, "slots": 25, "puSlots": 20 },
  "senior": { "player": 20, "playUp": 15, "team": 75, "slots": 24, "puSlots": 0 },
  "coach": 20, "cup": 100, "juvenile": 50, "seniorOne": 60, "seniorMulti": 100,
  "coachSlots": 50
}'::jsonb
where fees is null;

alter table settings alter column fees set not null;
