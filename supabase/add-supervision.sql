-- Supervision (veille personnalisée) et comptes individuels. À coller dans le SQL Editor de Supabase.
-- Tout est AJOUTÉ : aucune table existante n'est modifiée, sauf deux colonnes optionnelles ajoutées à ai_usage.
-- Aucune lecture publique : toutes ces tables sont réservées à la clé de service (serveur et GitHub Actions) ;
-- l'isolation entre comptes est assurée par le serveur (chaque requête filtre sur owner_id).
-- Peut être exécuté plusieurs fois sans dommage.

-- 1. Comptes individuels. L'identifiant est en minuscules : c'est la clé du compte et le propriétaire des données.
--    Le mot de passe n'est jamais stocké : seulement son hachage (voir scripts/create-account.ts).
create table if not exists accounts (
  identifier     text primary key check (identifier ~ '^[a-z0-9._-]{3,40}$'),
  display_name   text not null,
  password_hash  text not null,
  tier           text not null default 'intelligence'
                 check (tier in ('owner', 'plus', 'intelligence', 'pro', 'enterprise')),
  timezone       text not null default 'Europe/Paris',
  disabled       boolean not null default false,
  -- Prévus pour l'inscription libre à venir (adresse de contact, dernière connexion, acceptation des conditions).
  email          text,
  last_login_at  timestamptz,
  terms_accepted_at timestamptz,
  created_at     timestamptz not null default now()
);
alter table accounts enable row level security;

-- 2. Les veilles. Une par compte pour l'offre Intelligence, trois pour Pro (limite vérifiée côté serveur).
create table if not exists supervisions (
  id            uuid primary key default gen_random_uuid(),
  owner_id      text not null,
  status        text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  name          text not null,
  user_request  text not null default '',
  -- {"kind":"circle","lat":13.6,"lon":25.3,"radiusKm":150} ou {"kind":"countries","codes":["SD"]}
  zone          jsonb not null default '{}'::jsonb,
  -- {"themes":[], "entities":[], "keywords":[], "exclusions":[], "languages":[]}
  criteria      jsonb not null default '{}'::jsonb,
  -- [{"type":"gdelt"|"rss"|"telegram","ref":"...","enabled":true}]
  sources       jsonb not null default '[]'::jsonb,
  -- {"dailyHour":8,"weeklyDay":1}
  schedule      jsonb not null default '{}'::jsonb,
  last_run_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists supervisions_owner_idx on supervisions (owner_id, status);
alter table supervisions enable row level security;

-- 3. Les publications collectées, une seule fois pour tous (partagées, jamais attachées à un compte).
create table if not exists supervision_items (
  id              bigint generated always as identity primary key,
  url_canonical   text not null unique,
  url             text not null,
  title           text not null,
  excerpt         text,
  language        text,
  source_kind     text not null,          -- rss | gdelt | telegram | zone_brief
  source_name     text,
  published_at    timestamptz,
  fetched_at      timestamptz not null default now(),
  latitude        double precision,
  longitude       double precision,
  geo_precision   text,                   -- exact | ville | zone | aucune
  geo_place       text,
  geo_confidence  smallint,
  geo_checked     boolean not null default false
);
create index if not exists supervision_items_published_idx on supervision_items (published_at desc);
alter table supervision_items enable row level security;

-- 4. Ce qui correspond à une veille : publication retenue, score et raison, regroupement en événement.
create table if not exists supervision_events (
  id              bigint generated always as identity primary key,
  supervision_id  uuid not null references supervisions (id) on delete cascade,
  owner_id        text not null,
  title           text not null,
  category        text,
  occurred_at     timestamptz,
  latitude        double precision,
  longitude       double precision,
  geo_precision   text,
  confidence      smallint,
  created_at      timestamptz not null default now()
);
create index if not exists supervision_events_owner_idx on supervision_events (supervision_id, occurred_at desc);
alter table supervision_events enable row level security;

create table if not exists supervision_matches (
  supervision_id  uuid not null references supervisions (id) on delete cascade,
  item_id         bigint not null references supervision_items (id) on delete cascade,
  owner_id        text not null,
  event_id        bigint references supervision_events (id) on delete set null,
  score           real not null default 0,
  reason          text,
  matched_at      timestamptz not null default now(),
  primary key (supervision_id, item_id)
);
create index if not exists supervision_matches_event_idx on supervision_matches (event_id);
alter table supervision_matches enable row level security;

-- 5. Synthèses quotidiennes et rapports hebdomadaires.
create table if not exists supervision_reports (
  id              bigint generated always as identity primary key,
  supervision_id  uuid not null references supervisions (id) on delete cascade,
  owner_id        text not null,
  kind            text not null check (kind in ('daily', 'weekly')),
  period_start    date not null,
  period_end      date not null,
  content         jsonb not null,
  model           text,
  cost_usd        numeric(10, 5) not null default 0,
  created_at      timestamptz not null default now(),
  unique (supervision_id, kind, period_start)
);
alter table supervision_reports enable row level security;

-- 6. Retours du testeur : pertinent, non pertinent, doublon, localisation incorrecte.
create table if not exists supervision_feedback (
  id              bigint generated always as identity primary key,
  supervision_id  uuid not null references supervisions (id) on delete cascade,
  owner_id        text not null,
  target_type     text not null check (target_type in ('item', 'event', 'report')),
  target_id       text not null,
  kind            text not null check (kind in ('relevant', 'irrelevant', 'duplicate', 'wrong_location', 'comment')),
  comment         text,
  created_at      timestamptz not null default now()
);
alter table supervision_feedback enable row level security;

-- 7. Journal des passages de collecte (durée, volumes, erreurs) : un passage échoué reste visible et relançable.
create table if not exists supervision_runs (
  id              bigint generated always as identity primary key,
  supervision_id  uuid references supervisions (id) on delete cascade,
  kind            text not null,          -- collect | daily | weekly
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  status          text not null default 'running' check (status in ('running', 'ok', 'error')),
  stats           jsonb not null default '{}'::jsonb,
  error           text
);
create index if not exists supervision_runs_idx on supervision_runs (supervision_id, started_at desc);
alter table supervision_runs enable row level security;

-- 8. Coût IA par compte : deux colonnes optionnelles sur le journal existant (les anciens enregistrements restent valides).
alter table ai_usage add column if not exists owner_id text;
alter table ai_usage add column if not exists supervision_id uuid;
-- Réservation de budget : une ligne « reserved » (coût maximal estimé) est écrite AVANT l'appel, puis remplacée par le
-- coût réel (« done ») ; deux traitements simultanés ne peuvent donc pas dépasser ensemble le plafond du compte.
alter table ai_usage add column if not exists status text not null default 'done';
create index if not exists ai_usage_owner_idx on ai_usage (owner_id, created_at);

-- 9. Cloisonnement des dossiers d'Investigation (Notes, Graph) par compte. Les dossiers existants deviennent ceux du
--    compte fondateur « nicof » (valeur par défaut de l'identifiant Nicof ; si ADMIN_USER est réglé autrement, dis-le-moi).
--    Les morceaux (investigation_cloud_chunks) ne sont lus qu'après vérification du propriétaire du dossier.
alter table investigation_cloud add column if not exists owner_id text not null default 'nicof';
create index if not exists investigation_cloud_owner_idx on investigation_cloud (owner_id);
