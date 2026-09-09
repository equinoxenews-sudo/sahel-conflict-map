-- Tracks which raw articles have already been fed into an AI-synthesized
-- brief (lib/syncBriefs.ts), so the daily brief run doesn't keep
-- re-summarizing (and re-billing) the same articles every day.
-- Run once in Supabase -> SQL Editor.

alter table articles
  add column if not exists used_in_brief boolean not null default false;

create index if not exists articles_used_in_brief_idx on articles (zone_slug, used_in_brief);
