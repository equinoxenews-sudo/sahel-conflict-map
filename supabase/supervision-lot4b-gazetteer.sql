-- Supervision V1, Lot 4b (localisation sans IA) : dictionnaire de lieux et position des publications collectées.
-- À coller dans le SQL Editor de la PRÉPRODUCTION (equinoxe-staging) UNIQUEMENT, APRÈS supervision-lot4-collection.sql.
-- Tout est AJOUTÉ (préfixe « sv_ »). Peut être exécuté plusieurs fois sans dommage.
--
-- Données géographiques © GeoNames (https://www.geonames.org), licence Creative Commons Attribution 4.0 : la mention est OBLIGATOIRE
-- partout où une position issue de ce dictionnaire est affichée (elle l'est dans le panneau « sources et preuves » et sous la carte).

-- Noms de lieux, une ligne par variante de nom (nom principal ou nom alternatif). On ne garde que des LOCALITÉS (classe P) et des
-- régions administratives (ADM1 à ADM3) : les puits, cours d'eau, collines, etc. de GeoNames donneraient de fausses positions.
create table if not exists sv_place_names (
  geoname_id    bigint not null,
  name_key      text not null,            -- nom sans accents, en minuscules, mots séparés par une espace
  name          text not null,            -- nom d'affichage
  country       text not null,            -- code ISO 3166-1 alpha-2
  latitude      double precision not null,
  longitude     double precision not null,
  feature_code  text not null,            -- PPL, PPLA, ADM1, ADM2…
  population    integer not null default 0,
  is_main       boolean not null default false,
  primary key (geoname_id, name_key)
);
create index if not exists sv_place_names_lookup_idx on sv_place_names (country, name_key);

-- Position d'une publication rattachée, DÉDUITE DU TEXTE (jamais inventée) : aucun lieu reconnu ou lieu ambigu = pas de position.
alter table sv_matches add column if not exists place_name    text;
alter table sv_matches add column if not exists latitude      double precision;
alter table sv_matches add column if not exists longitude     double precision;
alter table sv_matches add column if not exists geo_precision text check (geo_precision in ('ville', 'zone'));
alter table sv_matches add column if not exists geo_source    text;

-- Sécurité : comme le reste du modèle (RLS sans politique, droits retirés aux clés publiques).
alter table sv_place_names enable row level security;
revoke all on sv_place_names from anon, authenticated;
