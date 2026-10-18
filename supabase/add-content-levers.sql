-- Leviers de contenu pilotés depuis ÉQUINOXE HQ (décision de Nicolas, 18/10/2026).
-- À coller UNE FOIS dans Supabase → SQL Editor, puis « Run ». Sans danger à relancer.
--
-- 1. Consigne du jour par zone : lue par la rédaction automatique des analystes (8 h)
--    et par la synthèse de zone. Écriture : HQ uniquement (clé de service).
-- 2. Bandeau LATEST : titres épinglés par Nicolas depuis le HQ, en plus des titres
--    forts choisis automatiquement parmi les articles des analystes.

create table if not exists zone_directives (
  id bigint generated always as identity primary key,
  zone_slug text not null,
  text text not null check (char_length(text) between 1 and 1000),
  active_until timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists zone_directives_zone_idx on zone_directives (zone_slug, active_until desc);
alter table zone_directives enable row level security;

create table if not exists ticker_items (
  id bigint generated always as identity primary key,
  text text not null check (char_length(text) between 1 and 200),
  href text check (href is null or href ~ '^(https://|/)'),
  proposed_by text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists ticker_items_expiry_idx on ticker_items (expires_at desc);
alter table ticker_items enable row level security;
drop policy if exists "ticker_items_public_read" on ticker_items;
create policy "ticker_items_public_read" on ticker_items
  for select to anon, authenticated using (expires_at > now());
