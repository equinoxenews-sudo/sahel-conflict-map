-- Supervision V1, Lot 4 (collecte sans IA) : publications collectées, rattachement aux Supervisions, journal des collectes.
-- À coller dans le SQL Editor de la PRÉPRODUCTION (equinoxe-staging) UNIQUEMENT, APRÈS supervision-lot1.sql.
-- Tout est AJOUTÉ (préfixe « sv_ »). Peut être exécuté plusieurs fois sans dommage.

-- Publications collectées (articles de presse repérés par une recherche ou un flux). Contenu PUBLIC et PARTAGÉ : une même publication
-- n'est rangée qu'une fois (adresse canonique unique) quel que soit le nombre de Supervisions qu'elle intéresse.
create table if not exists sv_items (
  id             uuid primary key default gen_random_uuid(),
  url_canonical  text not null unique,
  url            text not null,
  title          text not null,
  excerpt        text,
  source_kind    text not null check (source_kind in ('gnews', 'rss')),
  source_name    text,
  published_at   timestamptz,
  first_seen_at  timestamptz not null default now()
);
create index if not exists sv_items_published_idx on sv_items (published_at desc);

-- Rattachement d'une publication à UNE Supervision, avec la raison écrite (la correspondance est déterministe : aucun appel IA).
create table if not exists sv_matches (
  supervision_id  uuid not null references sv_supervisions (id) on delete cascade,
  item_id         uuid not null references sv_items (id) on delete cascade,
  score           smallint not null,
  reason          text not null,
  terms           text[] not null default '{}',
  theme           text not null,
  matched_at      timestamptz not null default now(),
  primary key (supervision_id, item_id)
);
create index if not exists sv_matches_supervision_idx on sv_matches (supervision_id, matched_at desc);

-- Journal des collectes : qui a lancé quoi, quand, avec quel résultat. Une ligne par passage.
create table if not exists sv_collection_runs (
  id              uuid primary key default gen_random_uuid(),
  supervision_id  uuid not null references sv_supervisions (id) on delete cascade,
  trigger         text not null check (trigger in ('manual', 'scheduled')),
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  status          text not null check (status in ('running', 'ok', 'partial', 'failed')),
  stats           jsonb not null default '{}'::jsonb,
  queries         text[] not null default '{}',
  error           text
);
create index if not exists sv_collection_runs_idx on sv_collection_runs (supervision_id, started_at desc);

-- Ouverture d'un passage, ATOMIQUE : sous verrou propre à la Supervision, on vérifie qu'elle appartient au compte, qu'elle n'est pas en
-- lecture seule, qu'aucun passage n'est déjà en cours (moins de 10 minutes) et que le dernier passage réussi n'est pas trop récent.
-- Deux clics simultanés ne lancent donc jamais deux collectes.
create or replace function sv_begin_collection(
  p_owner text, p_supervision_id uuid, p_trigger text, p_min_interval_minutes integer default 15, p_now timestamptz default now())
returns jsonb language plpgsql as $$
declare
  v_state   text;
  v_running uuid;
  v_last    timestamptz;
  v_id      uuid;
  v_next    timestamptz;
begin
  perform pg_advisory_xact_lock(hashtext('sv_collect:' || p_supervision_id::text));

  select state into v_state from sv_supervisions where id = p_supervision_id and owner_id = p_owner;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if v_state in ('read_only_grace', 'pending_deletion', 'deleted') then return jsonb_build_object('ok', false, 'code', 'read_only'); end if;

  select id into v_running from sv_collection_runs
    where supervision_id = p_supervision_id and status = 'running' and started_at > p_now - interval '10 minutes' limit 1;
  if found then return jsonb_build_object('ok', false, 'code', 'already_running', 'run_id', v_running); end if;

  select max(started_at) into v_last from sv_collection_runs where supervision_id = p_supervision_id and status in ('ok', 'partial');
  if v_last is not null then
    v_next := v_last + make_interval(mins => p_min_interval_minutes);
    if v_next > p_now then
      return jsonb_build_object('ok', false, 'code', 'too_soon', 'retry_after_seconds', ceil(extract(epoch from (v_next - p_now)))::integer);
    end if;
  end if;

  insert into sv_collection_runs (supervision_id, trigger, started_at, status) values (p_supervision_id, p_trigger, p_now, 'running') returning id into v_id;
  return jsonb_build_object('ok', true, 'run_id', v_id);
end $$;

-- Sécurité : comme le reste du modèle (RLS sans politique, droits retirés aux clés publiques, fonctions réservées à la clé de service).
alter table sv_items enable row level security;
alter table sv_matches enable row level security;
alter table sv_collection_runs enable row level security;
revoke all on sv_items, sv_matches, sv_collection_runs from anon, authenticated;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'sv\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
