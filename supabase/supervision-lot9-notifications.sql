-- Supervision V1, Lot 9 : notifications par e-mail (préférences, file d'envoi, journal). Sans IA.
-- À coller dans le SQL Editor de la PRÉPRODUCTION (equinoxe-staging) UNIQUEMENT, APRÈS supervision-lot1.sql.
-- Tout est AJOUTÉ (préfixe « sv_ »). Peut être exécuté plusieurs fois sans dommage.
--
-- Aucun e-mail réel ne part depuis la préproduction : le code force le mode « sans envoi » (les messages sont écrits dans le journal avec
-- le statut dry_run) sauf pour des destinataires de test explicitement autorisés.
--  - sv_notification_rules : les préférences d'UNE Supervision (niveaux d'e-mail immédiat, digest, destinataire et sa confirmation).
--  - sv_email_outbox : la file d'envoi ET le journal. Une ligne par message à envoyer ; la clé de déduplication empêche d'envoyer deux fois
--    la même alerte ou le même digest, même si la tâche planifiée est relancée.

create table if not exists sv_notification_rules (
  supervision_id      uuid primary key references sv_supervisions (id) on delete cascade,
  enabled             boolean not null default false,
  immediate_levels    text[] not null default '{}' check (immediate_levels <@ array['critique', 'importante']),
  digest              text not null default 'off' check (digest in ('off', 'daily', 'weekly')),
  recipient           text check (recipient is null or (char_length(recipient) <= 254 and recipient ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  recipient_verified  boolean not null default false,
  -- Date d'activation des notifications : seules les alertes plus récentes sont envoyées (pas d'avalanche d'historique à l'activation).
  enabled_at          timestamptz,
  revision            integer not null default 1,
  updated_at          timestamptz not null default now()
);

create table if not exists sv_email_outbox (
  id              uuid primary key default gen_random_uuid(),
  supervision_id  uuid not null references sv_supervisions (id) on delete cascade,
  kind            text not null check (kind in ('immediate', 'digest', 'test', 'confirm')),
  dedupe_key      text not null check (char_length(dedupe_key) between 1 and 200),
  to_email        text not null check (char_length(to_email) <= 254),
  payload         jsonb not null default '{}'::jsonb,
  status          text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'dry_run', 'skipped')),
  attempts        integer not null default 0,
  subject         text,
  send_after      timestamptz not null default now(),
  claimed_at      timestamptz,
  created_at      timestamptz not null default now(),
  sent_at         timestamptz,
  provider_id     text,
  error           text,
  unique (supervision_id, dedupe_key)
);
create index if not exists sv_email_outbox_due_idx on sv_email_outbox (send_after) where status in ('pending', 'sending');
create index if not exists sv_email_outbox_journal_idx on sv_email_outbox (supervision_id, created_at desc);

-- Préférences : contrôle du propriétaire et de la lecture seule, sous verrou. Changer d'adresse annule la confirmation.
create or replace function sv_set_notification_rules(
  p_owner text, p_supervision_id uuid, p_enabled boolean, p_levels text[], p_digest text, p_recipient text, p_now timestamptz default now())
returns jsonb language plpgsql as $$
declare
  v_state text;
  v_old   sv_notification_rules;
  v_new   sv_notification_rules;
  v_ver   boolean;
  v_at    timestamptz;
begin
  perform pg_advisory_xact_lock(hashtext('sv_notify:' || p_supervision_id::text));

  select state into v_state from sv_supervisions where id = p_supervision_id and owner_id = p_owner;
  if not found or v_state = 'deleted' then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if v_state in ('read_only_grace', 'pending_deletion') then return jsonb_build_object('ok', false, 'code', 'read_only'); end if;
  if p_digest not in ('off', 'daily', 'weekly') or not (p_levels <@ array['critique', 'importante']) then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;

  select * into v_old from sv_notification_rules where supervision_id = p_supervision_id;
  v_ver := coalesce(v_old.recipient_verified, false) and v_old.recipient is not distinct from p_recipient;
  v_at := case when p_enabled and not coalesce(v_old.enabled, false) then p_now else v_old.enabled_at end;

  insert into sv_notification_rules (supervision_id, enabled, immediate_levels, digest, recipient, recipient_verified, enabled_at, revision, updated_at)
    values (p_supervision_id, p_enabled, p_levels, p_digest, p_recipient, v_ver, v_at, 1, p_now)
  on conflict (supervision_id) do update set
    enabled = excluded.enabled, immediate_levels = excluded.immediate_levels, digest = excluded.digest, recipient = excluded.recipient,
    recipient_verified = excluded.recipient_verified, enabled_at = excluded.enabled_at,
    revision = sv_notification_rules.revision + 1, updated_at = excluded.updated_at
  returning * into v_new;

  return jsonb_build_object('ok', true, 'rules', jsonb_build_object(
    'enabled', v_new.enabled, 'immediate_levels', v_new.immediate_levels, 'digest', v_new.digest, 'recipient', v_new.recipient,
    'recipient_verified', v_new.recipient_verified, 'enabled_at', v_new.enabled_at, 'revision', v_new.revision));
end $$;

-- Confirmation de l'adresse (appelée par le serveur APRÈS vérification de la signature du lien) : valable seulement si l'adresse
-- confirmée est encore celle des préférences.
create or replace function sv_confirm_recipient(p_supervision_id uuid, p_email text, p_now timestamptz default now())
returns jsonb language plpgsql as $$
declare
  v_rows integer;
begin
  update sv_notification_rules set recipient_verified = true, revision = revision + 1, updated_at = p_now
    where supervision_id = p_supervision_id and recipient = p_email and not recipient_verified;
  get diagnostics v_rows = row_count;
  if v_rows = 1 then return jsonb_build_object('ok', true, 'confirmed', true); end if;
  if exists (select 1 from sv_notification_rules where supervision_id = p_supervision_id and recipient = p_email and recipient_verified) then
    return jsonb_build_object('ok', true, 'confirmed', false, 'already', true);
  end if;
  return jsonb_build_object('ok', false, 'code', 'not_found');
end $$;

-- Mise en file : une seule ligne par clé de déduplication (rejouer ne duplique rien).
create or replace function sv_enqueue_email(
  p_supervision_id uuid, p_kind text, p_dedupe_key text, p_to text, p_payload jsonb, p_send_after timestamptz, p_now timestamptz default now())
returns jsonb language plpgsql as $$
declare
  v_id uuid;
begin
  insert into sv_email_outbox (supervision_id, kind, dedupe_key, to_email, payload, send_after, created_at)
    values (p_supervision_id, p_kind, p_dedupe_key, p_to, coalesce(p_payload, '{}'::jsonb), p_send_after, p_now)
  on conflict (supervision_id, dedupe_key) do nothing
  returning id into v_id;
  return jsonb_build_object('ok', true, 'inserted', v_id is not null, 'id', v_id);
end $$;

-- Réserve les messages dus (deux tâches simultanées ne prennent jamais le même) ; un message réservé depuis plus de p_stale minutes
-- sans résultat est repris. Au bout de 3 tentatives il passe en « failed » (voir sv_finish_email).
create or replace function sv_claim_due_emails(p_limit integer, p_now timestamptz default now(), p_stale_minutes integer default 10, p_only uuid[] default null)
returns jsonb language plpgsql as $$
declare
  v_rows jsonb;
begin
  with due as (
    select id from sv_email_outbox
      where ((status = 'pending' and send_after <= p_now and attempts < 3)
         or (status = 'sending' and claimed_at < p_now - make_interval(mins => p_stale_minutes) and attempts < 3))
        and (p_only is null or supervision_id = any(p_only))
      order by send_after
      limit p_limit
      for update skip locked
  ), claimed as (
    update sv_email_outbox o set status = 'sending', claimed_at = p_now, attempts = o.attempts + 1
      from due where o.id = due.id
      returning o.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'supervision_id', supervision_id, 'kind', kind, 'dedupe_key', dedupe_key, 'to_email', to_email, 'payload', payload,
    'attempts', attempts, 'created_at', created_at) order by send_after), '[]'::jsonb)
  into v_rows from claimed;
  return jsonb_build_object('ok', true, 'rows', v_rows);
end $$;

-- Résultat d'un envoi. Un échec RÉESSAYABLE avant la 3e tentative remet le message en file (reprise au prochain passage) ; un échec
-- définitif (p_final : adresse refusée, clé invalide…) est enregistré tel quel.
create or replace function sv_finish_email(
  p_id uuid, p_status text, p_provider_id text, p_error text, p_subject text, p_now timestamptz default now(), p_final boolean default false)
returns jsonb language plpgsql as $$
declare
  v_attempts integer;
  v_final    text;
begin
  if p_status not in ('sent', 'failed', 'dry_run', 'skipped') then return jsonb_build_object('ok', false, 'code', 'invalid_input'); end if;
  select attempts into v_attempts from sv_email_outbox where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  v_final := case when p_status = 'failed' and v_attempts < 3 and not p_final then 'pending' else p_status end;
  update sv_email_outbox set
    status = v_final, provider_id = p_provider_id, error = left(p_error, 300), subject = coalesce(p_subject, subject),
    sent_at = case when p_status in ('sent', 'dry_run') then p_now else sent_at end, claimed_at = null
    where id = p_id;
  return jsonb_build_object('ok', true, 'status', v_final);
end $$;

-- Sécurité : comme le reste du modèle (RLS sans politique, droits retirés aux clés publiques, fonctions réservées à la clé de service).
alter table sv_notification_rules enable row level security;
alter table sv_email_outbox enable row level security;
revoke all on sv_notification_rules, sv_email_outbox from anon, authenticated;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'sv\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
