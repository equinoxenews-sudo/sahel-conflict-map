-- Veille hebdomadaire OSINT et IA (Mon espace > Menu) : les articles choisis chaque dimanche soir par
-- scripts/veille-osint.ts, avec leur titre et leur résumé en français. L'historique est conservé ; le Menu affiche les 20
-- plus récents. Une ligne par article (l'adresse est unique : un article n'est jamais publié deux fois).
-- Aucune lecture publique : seule la clé de service y accède (le site la lit pour le compte connecté, route /api/espace/veille).
-- À coller dans le SQL Editor de Supabase.

create table if not exists veille_osint (
  id bigint generated always as identity primary key,
  url text not null unique,
  source_id text not null,
  source_name text not null,
  title text not null,                 -- titre d'origine
  title_fr text not null,
  summary_fr text not null,
  image_url text,
  published_at timestamptz not null,   -- date de parution chez l'éditeur
  picked_at timestamptz not null default now(),
  model text
);

create index if not exists veille_osint_picked_idx on veille_osint (picked_at desc, published_at desc);

alter table veille_osint enable row level security;
-- Volontairement aucune politique : l'accès public (clé anon) est refusé.
