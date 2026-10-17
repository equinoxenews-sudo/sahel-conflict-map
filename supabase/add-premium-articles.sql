-- Articles premium (rubrique Analyse de chaque zone), rédigés par les analystes du HQ
-- puis validés par Nicolas. À coller UNE FOIS dans Supabase → SQL Editor, puis « Run ».
-- Sans danger à relancer.
--
-- Écriture : uniquement par le HQ (clé de service). Lecture publique : uniquement les
-- articles publiés (politique RLS). Un brouillon n'est visible que par son lien d'aperçu
-- secret, lu côté serveur par le site.

create table if not exists premium_articles (
  id bigint generated always as identity primary key,
  zone_slug text not null,
  title text not null check (char_length(title) between 1 and 300),
  summary text check (char_length(summary) <= 1000),
  body_md text not null check (char_length(body_md) <= 200000),
  author_agent text,
  author_name text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  preview_token text not null,
  hq_task_id bigint unique,
  hq_revision integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists premium_articles_zone_idx on premium_articles (zone_slug, published_at desc);

alter table premium_articles enable row level security;
drop policy if exists "premium_articles_public_read" on premium_articles;
create policy "premium_articles_public_read" on premium_articles
  for select to anon, authenticated using (status = 'published');

-- Le jeton d'aperçu n'est jamais lisible avec la clé publique.
revoke select on premium_articles from anon, authenticated;
grant select (id, zone_slug, title, summary, body_md, author_agent, author_name, status, created_at, updated_at, published_at)
  on premium_articles to anon, authenticated;
