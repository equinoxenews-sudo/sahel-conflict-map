-- Analystes de zone (V2, étape 1) : indice de confiance, géolocalisation des
-- synthèses et messages Telegram comme sources complémentaires.
-- À coller UNE FOIS dans Supabase → SQL Editor, puis « Run ». Sans danger à relancer.
-- N'efface ni ne modifie aucune donnée existante : ajout de colonnes et de tables.

-- 1. Synthèses : indice de confiance (0-100 %), étiquette, revendication,
--    nombre de sources et position sur la carte d'actualités.
alter table zone_briefs add column if not exists confidence smallint
  check (confidence between 0 and 100);
alter table zone_briefs add column if not exists confidence_label text;
alter table zone_briefs add column if not exists claimed_by text;
alter table zone_briefs add column if not exists source_count smallint;
alter table zone_briefs add column if not exists place_name text;
alter table zone_briefs add column if not exists place_country text;
alter table zone_briefs add column if not exists latitude double precision;
alter table zone_briefs add column if not exists longitude double precision;
-- ville : lieu cité dans l'article ; capitale : information d'ordre national.
alter table zone_briefs add column if not exists geo_precision text
  check (geo_precision in ('ville', 'capitale'));

-- 2. Messages des canaux Telegram publics suivis (lib/telegramChannels.ts).
--    Sources COMPLÉMENTAIRES : elles étoffent les articles de presse et ne
--    deviennent une synthèse à part entière qu'à des conditions strictes
--    (lib/synthesizeBriefs.ts). Lecture serveur uniquement.
create table if not exists telegram_posts (
  id bigint generated always as identity primary key,
  channel text not null,
  zone_slug text,
  url text not null unique,
  text text not null,
  image_url text,
  published_at timestamptz,
  used_in_brief boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists telegram_posts_zone_idx on telegram_posts (zone_slug, published_at desc);
alter table telegram_posts enable row level security;
-- Aucune politique : pas de lecture publique (contenus non vérifiés).

-- 3. Cache de géolocalisation (OpenStreetMap Nominatim) : un même lieu n'est
--    demandé qu'une fois, pour respecter les règles d'usage du service gratuit.
create table if not exists geocode_cache (
  query text primary key,
  latitude double precision,
  longitude double precision,
  label text,
  created_at timestamptz not null default now()
);
alter table geocode_cache enable row level security;
