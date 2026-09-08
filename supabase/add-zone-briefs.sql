-- Synthesized OSINT briefs: each row groups several real source articles
-- into one short AI-written summary (lib/synthesizeBriefs.ts), rather than
-- one row per raw article headline (that's still what the `articles` table
-- holds). Run once in Supabase -> SQL Editor.

create table if not exists zone_briefs (
  id              bigint generated always as identity primary key,
  zone_slug       text not null,
  title           text not null,
  summary         text not null,
  source_urls     text[] not null default '{}',
  source_domains  text[] not null default '{}',
  published_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index if not exists zone_briefs_zone_slug_idx on zone_briefs (zone_slug);
create index if not exists zone_briefs_published_at_idx on zone_briefs (published_at);

alter table zone_briefs enable row level security;

create policy "Public read access"
  on zone_briefs
  for select
  using (true);
