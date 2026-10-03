-- Taxonomie éditoriale Équinoxe des synthèses (remplace l'usage des
-- catégories ACLED-like dans les listes d'articles) : thématique principale,
-- jusqu'à 3 thématiques secondaires, type d'événement, importance. Les
-- anciennes synthèses gardent leur colonne category (repli géré côté code).
-- Index pour parcourir rapidement l'historique d'une zone sur 3 mois.
-- Run once in Supabase -> SQL Editor.

alter table zone_briefs
  add column if not exists primary_theme text,
  add column if not exists secondary_themes text[] not null default '{}',
  add column if not exists event_type text,
  add column if not exists importance text;

create index if not exists zone_briefs_zone_published_idx
  on zone_briefs (zone_slug, published_at desc);
