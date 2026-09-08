-- Adds a 1-5 reliability score (5 = most reliable) to conflict_events.
-- Run once in Supabase -> SQL Editor.

alter table conflict_events
  add column if not exists num_mentions integer,
  add column if not exists reliability smallint not null default 3,
  add column if not exists summary text;

-- Backfill num_mentions for existing GDELT rows by pulling it back out of
-- the "Score Goldstein : X.X · N mention(s)" text stored in notes.
update conflict_events
set num_mentions = substring(notes from '(\d+) mention')::integer
where notes ~ '\d+ mention' and num_mentions is null;

-- Backfill reliability from num_mentions using the same tiers new rows get
-- at ingestion time (lib/reliability.ts computeReliability) — more
-- independent mentions of the same event = more corroborated.
update conflict_events
set reliability = case
  when num_mentions >= 20 then 5
  when num_mentions >= 10 then 4
  when num_mentions >= 6  then 3
  when num_mentions >= 3  then 2
  else 1
end
where num_mentions is not null;
