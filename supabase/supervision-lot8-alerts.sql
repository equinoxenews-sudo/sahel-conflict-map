-- Supervision V1, Lot 8 : décisions de l'utilisateur sur les alertes du tableau de bord (lue, conservée, masquée). Sans IA, aucun coût.
-- À coller dans le SQL Editor de la PRÉPRODUCTION (equinoxe-staging) UNIQUEMENT, APRÈS supervision-lot1.sql.
-- Tout est AJOUTÉ (préfixe « sv_ »). Peut être exécuté plusieurs fois sans dommage.
--
-- Une alerte n'est pas stockée : elle se déduit des événements du tableau (priorité « critique » ou « importante »). On n'enregistre que
-- la DÉCISION de l'utilisateur, avec le niveau qu'avait l'alerte à ce moment-là : si l'alerte monte de niveau plus tard, elle redevient
-- « à traiter ». « Rétablir » supprime la ligne : l'alerte est de nouveau à traiter.

create table if not exists sv_alert_states (
  supervision_id  uuid not null references sv_supervisions (id) on delete cascade,
  event_ref       text not null check (event_ref ~ '^[a-z]-[A-Za-z0-9-]{1,80}$'),
  status          text not null check (status in ('read', 'kept', 'hidden')),
  level           text not null check (level in ('importante', 'critique')),
  updated_at      timestamptz not null default now(),
  primary key (supervision_id, event_ref)
);

-- p_items : tableau JSON [{ "event_ref": "a-12", "level": "critique" }, …]. p_status : read, kept, hidden ou new (rétablir).
create or replace function sv_set_alert_states(
  p_owner text, p_supervision_id uuid, p_status text, p_items jsonb, p_max integer default 2000, p_now timestamptz default now())
returns jsonb language plpgsql as $$
declare
  v_state text;
  v_count integer;
  v_new   integer;
  v_item  jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('sv_alerts:' || p_supervision_id::text));

  select state into v_state from sv_supervisions where id = p_supervision_id and owner_id = p_owner;
  if not found or v_state = 'deleted' then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if v_state in ('read_only_grace', 'pending_deletion') then return jsonb_build_object('ok', false, 'code', 'read_only'); end if;
  if p_status not in ('read', 'kept', 'hidden', 'new') or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 100 then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;

  if p_status = 'new' then
    delete from sv_alert_states where supervision_id = p_supervision_id and event_ref in (select e->>'event_ref' from jsonb_array_elements(p_items) e);
    return jsonb_build_object('ok', true, 'applied', jsonb_array_length(p_items));
  end if;

  select count(*) into v_count from sv_alert_states where supervision_id = p_supervision_id;
  select count(*) into v_new from jsonb_array_elements(p_items) e
    where not exists (select 1 from sv_alert_states s where s.supervision_id = p_supervision_id and s.event_ref = e->>'event_ref');
  if v_count + v_new > p_max then return jsonb_build_object('ok', false, 'code', 'limit_reached', 'limit', p_max); end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into sv_alert_states (supervision_id, event_ref, status, level, updated_at)
      values (p_supervision_id, v_item->>'event_ref', p_status, v_item->>'level', p_now)
      on conflict (supervision_id, event_ref) do update set status = excluded.status, level = excluded.level, updated_at = excluded.updated_at;
  end loop;
  return jsonb_build_object('ok', true, 'applied', jsonb_array_length(p_items));
end $$;

-- Sécurité : comme le reste du modèle (RLS sans politique, droits retirés aux clés publiques, fonctions réservées à la clé de service).
alter table sv_alert_states enable row level security;
revoke all on sv_alert_states from anon, authenticated;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'sv\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
