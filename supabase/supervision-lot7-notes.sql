-- Supervision V1, Lot 7 : notes enregistrées (sans IA, aucun coût).
-- À coller dans le SQL Editor de la PRÉPRODUCTION (equinoxe-staging) UNIQUEMENT, APRÈS supervision-lot1.sql.
-- Tout est AJOUTÉ (préfixe « sv_ »). Peut être exécuté plusieurs fois sans dommage.
--
-- Une note appartient à UNE Supervision (donc à son propriétaire) et peut être attachée à une publication précise (event_ref, avec le
-- titre au moment de la note, pour la retrouver même si la publication est masquée plus tard). Une note supprimée est MASQUÉE
-- (deleted_at), jamais effacée. Une note modifiée garde un numéro de révision : deux onglets ne s'écrasent pas en silence.

create table if not exists sv_notes (
  id              uuid primary key default gen_random_uuid(),
  supervision_id  uuid not null references sv_supervisions (id) on delete cascade,
  -- Clé d'opération choisie par le navigateur : un double clic ou une relance ne crée jamais deux notes.
  client_key      text not null check (client_key ~ '^[A-Za-z0-9_-]{8,80}$'),
  event_ref       text check (event_ref is null or event_ref ~ '^[a-z]-[A-Za-z0-9-]{1,80}$'),
  event_title     text check (event_title is null or char_length(event_title) <= 300),
  body            text not null check (char_length(btrim(body)) between 1 and 4000),
  revision        integer not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  unique (supervision_id, client_key)
);
create index if not exists sv_notes_supervision_idx on sv_notes (supervision_id, created_at desc) where deleted_at is null;
create index if not exists sv_notes_event_idx on sv_notes (supervision_id, event_ref) where deleted_at is null and event_ref is not null;

-- Représentation d'une note renvoyée au serveur applicatif.
create or replace function sv_note_json(n sv_notes) returns jsonb language sql immutable as $$
  select jsonb_build_object('id', n.id, 'event_ref', n.event_ref, 'event_title', n.event_title, 'body', n.body,
                            'revision', n.revision, 'created_at', n.created_at, 'updated_at', n.updated_at)
$$;

-- Ajout ATOMIQUE : sous verrou propre à la Supervision on vérifie le propriétaire, la lecture seule et le plafond de notes.
-- Rejouer la même clé renvoie la note déjà créée (replay), sans doublon.
create or replace function sv_add_note(
  p_owner text, p_supervision_id uuid, p_key text, p_body text, p_event_ref text, p_event_title text,
  p_max integer default 500, p_now timestamptz default now())
returns jsonb language plpgsql as $$
declare
  v_state    text;
  v_existing sv_notes;
  v_count    integer;
  v_note     sv_notes;
begin
  perform pg_advisory_xact_lock(hashtext('sv_notes:' || p_supervision_id::text));

  select state into v_state from sv_supervisions where id = p_supervision_id and owner_id = p_owner;
  if not found or v_state = 'deleted' then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if v_state in ('read_only_grace', 'pending_deletion') then return jsonb_build_object('ok', false, 'code', 'read_only'); end if;

  select * into v_existing from sv_notes where supervision_id = p_supervision_id and client_key = p_key;
  if found then
    if v_existing.body <> btrim(p_body) or v_existing.event_ref is distinct from p_event_ref then
      return jsonb_build_object('ok', false, 'code', 'idempotency_conflict');
    end if;
    return jsonb_build_object('ok', true, 'replay', true, 'note', sv_note_json(v_existing));
  end if;

  select count(*) into v_count from sv_notes where supervision_id = p_supervision_id and deleted_at is null;
  if v_count >= p_max then return jsonb_build_object('ok', false, 'code', 'limit_reached', 'limit', p_max); end if;

  insert into sv_notes (supervision_id, client_key, event_ref, event_title, body, created_at, updated_at)
    values (p_supervision_id, p_key, p_event_ref, p_event_title, btrim(p_body), p_now, p_now)
    returning * into v_note;
  return jsonb_build_object('ok', true, 'replay', false, 'note', sv_note_json(v_note));
end $$;

-- Modification avec verrou optimiste : la révision lue par le navigateur doit être la révision actuelle.
create or replace function sv_update_note(
  p_owner text, p_supervision_id uuid, p_note_id uuid, p_body text, p_revision integer, p_now timestamptz default now())
returns jsonb language plpgsql as $$
declare
  v_state text;
  v_note  sv_notes;
begin
  perform pg_advisory_xact_lock(hashtext('sv_notes:' || p_supervision_id::text));

  select state into v_state from sv_supervisions where id = p_supervision_id and owner_id = p_owner;
  if not found or v_state = 'deleted' then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if v_state in ('read_only_grace', 'pending_deletion') then return jsonb_build_object('ok', false, 'code', 'read_only'); end if;

  select * into v_note from sv_notes where id = p_note_id and supervision_id = p_supervision_id and deleted_at is null;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if v_note.revision <> p_revision then
    return jsonb_build_object('ok', false, 'code', 'revision_conflict', 'current_revision', v_note.revision, 'note', sv_note_json(v_note));
  end if;

  update sv_notes set body = btrim(p_body), revision = revision + 1, updated_at = p_now where id = p_note_id returning * into v_note;
  return jsonb_build_object('ok', true, 'replay', false, 'note', sv_note_json(v_note));
end $$;

-- Suppression : la note est masquée, jamais effacée. Supprimer deux fois est sans effet.
create or replace function sv_delete_note(p_owner text, p_supervision_id uuid, p_note_id uuid, p_now timestamptz default now())
returns jsonb language plpgsql as $$
declare
  v_state text;
  v_note  sv_notes;
begin
  perform pg_advisory_xact_lock(hashtext('sv_notes:' || p_supervision_id::text));

  select state into v_state from sv_supervisions where id = p_supervision_id and owner_id = p_owner;
  if not found or v_state = 'deleted' then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if v_state in ('read_only_grace', 'pending_deletion') then return jsonb_build_object('ok', false, 'code', 'read_only'); end if;

  select * into v_note from sv_notes where id = p_note_id and supervision_id = p_supervision_id;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if v_note.deleted_at is not null then return jsonb_build_object('ok', true, 'replay', true); end if;

  update sv_notes set deleted_at = p_now where id = p_note_id;
  return jsonb_build_object('ok', true, 'replay', false);
end $$;

-- Sécurité : comme le reste du modèle (RLS sans politique, droits retirés aux clés publiques, fonctions réservées à la clé de service).
alter table sv_notes enable row level security;
revoke all on sv_notes from anon, authenticated;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'sv\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
