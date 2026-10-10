-- Journal des appels à l'API Anthropic : un enregistrement par appel (ou par lot),
-- avec le traitement à l'origine, les jetons, les recherches web et un coût estimé.
-- Sert à suivre le budget mensuel (lib/aiBudget.ts, lib/aiUsage.ts).
-- Aucune lecture publique : seule la clé de service (serveur et GitHub Actions) y accède.
-- À coller dans le SQL Editor de Supabase. Sans cette table, les traitements
-- tournent quand même, mais le budget ne peut pas être suivi ni imposé.

create table if not exists ai_usage (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  job text not null,                     -- sync-briefs | zone-synthesis | situation-report
  zone_slug text,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  web_searches integer not null default 0,
  cost_usd numeric(10, 5) not null default 0,   -- estimation d'après les tarifs publics
  ok boolean not null default true,
  note text
);

create index if not exists ai_usage_created_at_idx on ai_usage (created_at);

alter table ai_usage enable row level security;
-- Volontairement aucune politique : l'accès public (clé anon) est refusé.
