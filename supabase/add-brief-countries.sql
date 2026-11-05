-- Tags pays des articles (synthèses) : codes ISO 3 des pays dont l'article traite, le plus concerné en premier.
-- À exécuter une fois dans l'éditeur SQL de Supabase. Les articles déjà publiés peuvent être étiquetés ensuite par
--   npx tsx scripts/backfill-brief-countries.ts            (simulation : n'écrit rien)
--   npx tsx scripts/backfill-brief-countries.ts --apply    (écrit les tags)
alter table zone_briefs add column if not exists countries text[];

-- Recherche d'un pays dans les tags (opérateur @>) : index GIN.
create index if not exists zone_briefs_countries_idx on zone_briefs using gin (countries);
