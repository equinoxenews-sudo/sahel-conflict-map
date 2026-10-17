-- Analystes de zone (V2, étape 2) : articles « à trancher ».
-- Quand un analyste doute de la pertinence ou de la fiabilité d'une information,
-- l'article n'est pas publié : il attend ici la décision de Nicolas, envoyée par
-- Telegram (boutons Publier / Ne pas publier). Il n'apparaît sur le site qu'une
-- fois publié (copie dans zone_briefs).
-- À coller UNE FOIS dans Supabase → SQL Editor, puis « Run ». Sans danger à relancer.

create table if not exists brief_reviews (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  zone_slug text not null,
  title text not null,
  doubt text not null,
  -- Ligne prête à insérer dans zone_briefs si Nicolas publie.
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  decided_at timestamptz,
  brief_id bigint,
  telegram_message_id bigint
);
create index if not exists brief_reviews_status_idx on brief_reviews (status, created_at desc);
alter table brief_reviews enable row level security;
-- Aucune politique : lecture et écriture serveur uniquement.
