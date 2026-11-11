-- Supervision V1, Lot 10 : règles d'alerte choisies par l'utilisateur (thèmes, mots-clés, exclusions) pour les e-mails. Sans IA.
-- À coller dans le SQL Editor de la PRÉPRODUCTION (equinoxe-staging) UNIQUEMENT, APRÈS supervision-lot9-notifications.sql.
-- Tout est AJOUTÉ ou REMPLACÉ. Peut être exécuté plusieurs fois sans dommage.
--
-- Les règles RESTREIGNENT ce qui est envoyé (elles n'ajoutent jamais une alerte). Une valeur vide = aucune restriction.

alter table sv_notification_rules add column if not exists filters jsonb not null default '{}'::jsonb;

-- Garde-fou côté base : un objet JSON, trois listes au plus, 10 termes de 60 caractères au plus chacune.
alter table sv_notification_rules drop constraint if exists sv_notification_rules_filters_check;
alter table sv_notification_rules add constraint sv_notification_rules_filters_check check (
  jsonb_typeof(filters) = 'object'
  and octet_length(filters::text) <= 4000
  and (not filters ? 'themes' or (jsonb_typeof(filters -> 'themes') = 'array' and jsonb_array_length(filters -> 'themes') <= 4))
  and (not filters ? 'keywords' or (jsonb_typeof(filters -> 'keywords') = 'array' and jsonb_array_length(filters -> 'keywords') <= 10))
  and (not filters ? 'exclusions' or (jsonb_typeof(filters -> 'exclusions') = 'array' and jsonb_array_length(filters -> 'exclusions') <= 10))
);

-- La fonction d'enregistrement gagne un argument : l'ancienne version (sans règles) est retirée pour qu'aucun appel ne soit ambigu.
drop function if exists sv_set_notification_rules(text, uuid, boolean, text[], text, text, timestamptz);

create or replace function sv_set_notification_rules(
  p_owner text, p_supervision_id uuid, p_enabled boolean, p_levels text[], p_digest text, p_recipient text,
  p_filters jsonb default '{}'::jsonb, p_now timestamptz default now())
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
  if p_digest not in ('off', 'daily', 'weekly') or not (p_levels <@ array['critique', 'importante']) or jsonb_typeof(coalesce(p_filters, '{}'::jsonb)) <> 'object' then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;

  select * into v_old from sv_notification_rules where supervision_id = p_supervision_id;
  v_ver := coalesce(v_old.recipient_verified, false) and v_old.recipient is not distinct from p_recipient;
  v_at := case when p_enabled and not coalesce(v_old.enabled, false) then p_now else v_old.enabled_at end;

  insert into sv_notification_rules (supervision_id, enabled, immediate_levels, digest, recipient, recipient_verified, enabled_at, filters, revision, updated_at)
    values (p_supervision_id, p_enabled, p_levels, p_digest, p_recipient, v_ver, v_at, coalesce(p_filters, '{}'::jsonb), 1, p_now)
  on conflict (supervision_id) do update set
    enabled = excluded.enabled, immediate_levels = excluded.immediate_levels, digest = excluded.digest, recipient = excluded.recipient,
    recipient_verified = excluded.recipient_verified, enabled_at = excluded.enabled_at, filters = excluded.filters,
    revision = sv_notification_rules.revision + 1, updated_at = excluded.updated_at
  returning * into v_new;

  return jsonb_build_object('ok', true, 'rules', jsonb_build_object(
    'enabled', v_new.enabled, 'immediate_levels', v_new.immediate_levels, 'digest', v_new.digest, 'recipient', v_new.recipient,
    'recipient_verified', v_new.recipient_verified, 'enabled_at', v_new.enabled_at, 'filters', v_new.filters, 'revision', v_new.revision));
end $$;

-- Sécurité : comme le reste du modèle (fonctions réservées à la clé de service).
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'sv\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
