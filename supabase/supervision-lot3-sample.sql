-- Supervision V1, Lot 3 : tables de l'ÉCHANTILLON d'articles publics — À EXÉCUTER DANS LA PRÉPRODUCTION (equinoxe-staging) UNIQUEMENT.
-- Vérifie le nom du projet en haut à gauche du tableau de bord Supabase avant de lancer.
--
-- Ces deux tables reprennent le schéma de la production (mêmes noms, mêmes colonnes utiles) pour que le code qui les lira
-- soit identique en préproduction et en production. Elles servent à recevoir un échantillon de données PUBLIQUES.
--
-- Sécurité : RLS activée SANS aucune politique, et droits retirés aux rôles publics (anon, authenticated).
-- Seule la clé serveur (service_role) y accède. Contrairement à la production, il n'y a donc AUCUNE lecture publique.
--
-- Le script est rejouable sans danger : il ne crée que ce qui manque.

create table if not exists zone_briefs (
  id                bigint primary key,
  zone_slug         text not null,
  title             text not null,
  summary           text not null,
  source_urls       text[] not null default '{}',
  source_domains    text[] not null default '{}',
  published_at      timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  countries         text[],
  primary_theme     text,
  secondary_themes  text[] not null default '{}',
  event_type        text,
  importance        text,
  veracity          text,
  category          text,
  confidence        smallint check (confidence between 0 and 100),
  confidence_label  text,
  claimed_by        text,
  source_count      smallint,
  place_name        text,
  place_country     text,
  latitude          double precision,
  longitude         double precision,
  geo_precision     text
);

create index if not exists zone_briefs_zone_published_idx on zone_briefs (zone_slug, published_at desc);
create index if not exists zone_briefs_published_at_idx on zone_briefs (published_at desc);
create index if not exists zone_briefs_countries_idx on zone_briefs using gin (countries);

create table if not exists conflict_events (
  id            bigint primary key,
  external_id   text unique not null,
  event_date    date not null,
  country       text not null,
  latitude      double precision not null,
  longitude     double precision not null,
  category      text not null,
  fatalities    integer not null default 0,
  source        text,
  notes         text,
  num_mentions  integer,
  reliability   smallint not null default 3,
  summary       text,
  created_at    timestamptz not null default now()
);

create index if not exists conflict_events_country_idx on conflict_events (country);
create index if not exists conflict_events_event_date_idx on conflict_events (event_date desc);

alter table zone_briefs enable row level security;
alter table conflict_events enable row level security;

revoke all on table zone_briefs from anon, authenticated;
revoke all on table conflict_events from anon, authenticated;
