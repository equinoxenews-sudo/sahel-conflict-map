-- Thematic category per synthesized brief, chosen by the AI from the same
-- categories already used for map event markers — lets the Actualité
-- column be filtered by theme (e.g. "Violence against civilians" for
-- Afrique). Run once in Supabase -> SQL Editor.

alter table zone_briefs
  add column if not exists category text;
