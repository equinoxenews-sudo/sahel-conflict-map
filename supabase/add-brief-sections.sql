-- Full structured content for a synthesized brief — an array of
-- {heading, body} sections, letting a well-sourced topic get a genuine
-- multi-section piece while a thin one stays a single short section.
-- `summary` remains the short excerpt used for card previews.
-- Run once in Supabase -> SQL Editor.

alter table zone_briefs
  add column if not exists sections jsonb;
