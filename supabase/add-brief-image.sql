-- Adds a representative photo to synthesized briefs (picked from the
-- og:image of one of the cited source articles). Run once in Supabase ->
-- SQL Editor.

alter table zone_briefs
  add column if not exists image_url text;
