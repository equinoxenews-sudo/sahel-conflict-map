-- Synthèse politico-sécuritaire quotidienne de chaque zone, rédigée par un
-- agent IA (scripts/zone-synthesis.ts) à partir des synthèses Équinoxe et de
-- sources ouvertes. Une ligne par génération : l'historique est conservé,
-- l'affichage lit la plus récente. `fingerprint` identifie l'ensemble des
-- synthèses utilisées, pour ne régénérer que si nécessaire.
-- Run once in Supabase -> SQL Editor.

create table if not exists zone_syntheses (
  id bigint generated always as identity primary key,
  zone_slug text not null,
  generated_at timestamptz not null default now(),
  headline text not null,
  sections jsonb not null,
  sources jsonb not null default '[]'::jsonb,
  brief_ids bigint[] not null default '{}',
  fingerprint text not null,
  used_web_search boolean not null default false,
  model text
);

create index if not exists zone_syntheses_zone_generated_idx
  on zone_syntheses (zone_slug, generated_at desc);

alter table zone_syntheses enable row level security;

drop policy if exists "Public read access" on zone_syntheses;
create policy "Public read access"
  on zone_syntheses
  for select
  using (true);
