-- Tracks the health of each data sync pipeline (GDELT event export,
-- articles, briefs, vessels...) so the site can tell "no new events
-- today" apart from "this pipeline has been silently broken for days" —
-- and so existing data is never wiped just because today's run failed.
-- Run once in Supabase -> SQL Editor.

create table if not exists sync_status (
  source           text primary key,
  last_success_at  timestamptz,
  last_attempt_at  timestamptz not null default now(),
  last_error       text,
  last_count       integer
);

alter table sync_status enable row level security;

create policy "Public read access"
  on sync_status
  for select
  using (true);
