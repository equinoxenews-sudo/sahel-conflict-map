-- Real open-source article headlines pulled via GDELT DOC 2.0, restricted
-- to a curated list of reputable domains (lib/newsSources.ts). No AI-
-- generated summary yet — just real title + link + source, refreshed daily.
-- Run in Supabase -> SQL Editor.

create table if not exists articles (
  id           bigint generated always as identity primary key,
  zone_slug    text not null,
  title        text not null,
  url          text not null,
  domain       text,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (zone_slug, url)
);

create index if not exists articles_zone_slug_idx on articles (zone_slug);
create index if not exists articles_published_at_idx on articles (published_at);

alter table articles enable row level security;

create policy "Public read access"
  on articles
  for select
  using (true);
