-- Points de situation (PSIT) de chaque zone : 2 par semaine, préparés en
-- brouillon par un agent IA (scripts/situation-report.ts), relus et publiés
-- à la main depuis /admin/situation. Le public ne voit que `published`.
-- `items` : événements numérotés [{n, theme, date, text, place, lat, lon, brief_id}].
-- Run once in Supabase -> SQL Editor.

create table if not exists situation_reports (
  id bigint generated always as identity primary key,
  zone_slug text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  title text not null,
  items jsonb not null default '[]'::jsonb,
  conclusion text not null,
  image_url text,
  brief_ids bigint[] not null default '{}',
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists situation_reports_zone_end_idx
  on situation_reports (zone_slug, period_end desc);

alter table situation_reports enable row level security;

-- Lecture publique : uniquement les rapports publiés. Les brouillons ne sont
-- lisibles qu'avec la clé service (écran de relecture, côté serveur).
drop policy if exists "Public read published" on situation_reports;
create policy "Public read published"
  on situation_reports
  for select
  using (status = 'published');
