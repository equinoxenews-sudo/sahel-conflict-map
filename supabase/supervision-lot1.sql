-- Supervision V1, Lot 1 : modèle métier et sécurité.
-- À coller dans le SQL Editor de la PRÉPRODUCTION (equinoxe-staging) UNIQUEMENT. Ne pas exécuter sur la production.
-- Tout est AJOUTÉ (tables et fonctions préfixées « sv_ ») : aucune table existante n'est lue ni modifiée, y compris les anciennes
-- tables du prototype de Supervision (supervisions, supervision_*), qui restent à part. Peut être exécuté plusieurs fois sans dommage.
--
-- Sécurité : RLS activé SANS aucune politique sur toutes les tables, droits retirés à anon et authenticated, fonctions réservées à
-- la clé de service. L'isolation entre comptes est assurée par le serveur : chaque fonction prend le propriétaire en argument et
-- ne touche jamais aux lignes d'un autre propriétaire (tests A/B dans tests/integration).
--
-- Concurrence : chaque fonction qui décide d'un quota prend d'abord un verrou consultatif PAR COMPTE (pg_advisory_xact_lock) :
-- deux demandes simultanées du même compte sont donc traitées l'une après l'autre, sans qu'aucune ne voie un état périmé.

-- ============================================================================================================================
-- 1. Tables
-- ============================================================================================================================

-- Une Supervision (la définition de ce qu'on surveille ; la disposition du tableau de bord viendra au Lot 2 intégré).
create table if not exists sv_supervisions (
  id                        uuid primary key default gen_random_uuid(),
  owner_id                  text not null,
  name                      text not null check (char_length(name) between 3 and 80),
  state                     text not null default 'draft'
                            check (state in ('draft', 'initializing', 'active', 'paused', 'error', 'read_only_grace', 'pending_deletion', 'deleted')),
  -- Version de périmètre en vigueur, version de RÉFÉRENCE (dernière création ou refonte majeure : base des comparaisons
  -- cumulatives) et version en attente d'un crédit (refonte majeure non confirmée).
  current_scope_version_id  uuid,
  reference_scope_version_id uuid,
  pending_scope_version_id  uuid,
  created_at                timestamptz not null default now(),
  activated_at              timestamptz,
  paused_at                 timestamptz,
  state_changed_at          timestamptz not null default now()
);
create index if not exists sv_supervisions_owner_idx on sv_supervisions (owner_id, state);

-- Versions de périmètre : IMMUABLES une fois créées (une analyse ou une collecte se rattache toujours à la version qui l'a produite).
create table if not exists sv_scope_versions (
  id              uuid primary key default gen_random_uuid(),
  supervision_id  uuid not null references sv_supervisions (id) on delete cascade,
  version_no      integer not null,
  scope           jsonb not null,
  estimate        jsonb not null default '{}'::jsonb,
  is_major        boolean not null default false,
  major_reasons   text[] not null default '{}',
  origin          text not null check (origin in ('creation', 'minor_change', 'major_change', 'duplicate')),
  -- Date d'entrée en vigueur ; vide tant que la version n'est pas activée (brouillon ou refonte en attente).
  effective_at    timestamptz,
  created_at      timestamptz not null default now(),
  unique (supervision_id, version_no)
);

create or replace function sv_scope_versions_immutable() returns trigger language plpgsql as $$
begin
  if new.scope is distinct from old.scope
     or new.estimate is distinct from old.estimate
     or new.is_major is distinct from old.is_major
     or new.major_reasons is distinct from old.major_reasons
     or new.origin is distinct from old.origin
     or new.version_no is distinct from old.version_no
     or new.supervision_id is distinct from old.supervision_id then
    raise exception 'sv_scope_versions : une version de périmètre est immuable';
  end if;
  if old.effective_at is not null and new.effective_at is distinct from old.effective_at then
    raise exception 'sv_scope_versions : la date d''entrée en vigueur ne change plus une fois posée';
  end if;
  return new;
end $$;
drop trigger if exists sv_scope_versions_immutable_trg on sv_scope_versions;
create trigger sv_scope_versions_immutable_trg before update on sv_scope_versions for each row execute function sv_scope_versions_immutable();

-- Journal des opérations : idempotence (une clé = une opération, même après un double clic ou une relance) et décompte des crédits.
create table if not exists sv_operation_ledger (
  id               uuid primary key default gen_random_uuid(),
  owner_id         text not null,
  supervision_id   uuid references sv_supervisions (id) on delete set null,
  op_type          text not null check (op_type in ('activate_new', 'major_change', 'minor_change', 'pause', 'resume')),
  idempotency_key  text not null,
  -- pending : crédit réservé, en attente de confirmation ; committed : validé ; cancelled : annulé ou expiré (crédit rendu).
  status           text not null check (status in ('pending', 'committed', 'cancelled')),
  consumes_credit  boolean not null default false,
  scope_version_id uuid,
  details          jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  committed_at     timestamptz,
  cancelled_at     timestamptz,
  unique (owner_id, idempotency_key)
);
create index if not exists sv_operation_ledger_credit_idx on sv_operation_ledger (owner_id, consumes_credit, created_at);

-- Droits d'abonnement (décision D1 : posés à la main pendant le développement et la bêta ; pas de paiement pour l'instant).
create table if not exists sv_entitlements (
  id                uuid primary key default gen_random_uuid(),
  owner_id          text not null,
  plan              text not null check (plan in ('owner', 'plus', 'intelligence', 'pro', 'enterprise')),
  -- Surcharges facultatives des limites de l'offre (null : valeur de l'offre) ; credit_unlimited : aucun plafond de créations.
  active_limit      integer check (active_limit is null or active_limit >= 0),
  paused_limit      integer check (paused_limit is null or paused_limit >= 0),
  credit_limit      integer check (credit_limit is null or credit_limit >= 0),
  credit_unlimited  boolean not null default false,
  effective_at      timestamptz not null default now(),
  expires_at        timestamptz,
  source            text not null default 'manual',
  note              text,
  created_at        timestamptz not null default now()
);
create index if not exists sv_entitlements_owner_idx on sv_entitlements (owner_id, effective_at desc);

-- Périodes de grâce (résiliation, rétrogradation) : structure prête, logique complète au Lot 6.
create table if not exists sv_grace_periods (
  id                          uuid primary key default gen_random_uuid(),
  owner_id                    text not null,
  reason                      text not null check (reason in ('cancellation', 'downgrade')),
  starts_at                   timestamptz not null,
  expires_at                  timestamptz not null,
  protected_supervision_ids   uuid[] not null default '{}',
  notices                     jsonb not null default '[]'::jsonb,
  created_at                  timestamptz not null default now()
);
create index if not exists sv_grace_periods_owner_idx on sv_grace_periods (owner_id, expires_at);

-- Registre du coût IA par abonnement : réservation AVANT l'appel, règlement après (voir sv_reserve_ai_budget).
create table if not exists sv_ai_ledger (
  id              uuid primary key default gen_random_uuid(),
  owner_id        text not null,
  supervision_id  uuid,
  operation_id    text not null,
  job             text not null,
  model           text not null,
  status          text not null check (status in ('reserved', 'settled', 'released')),
  reserved_usd    numeric(12, 5) not null check (reserved_usd >= 0),
  actual_usd      numeric(12, 5) check (actual_usd is null or actual_usd >= 0),
  input_tokens    integer,
  output_tokens   integer,
  ok              boolean,
  created_at      timestamptz not null default now(),
  settled_at      timestamptz,
  unique (owner_id, operation_id)
);
create index if not exists sv_ai_ledger_owner_idx on sv_ai_ledger (owner_id, created_at);

-- Journal d'audit (qui a fait quoi, avec quel résultat).
create table if not exists sv_audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor      text not null,
  owner_id   text,
  action     text not null,
  object     text,
  result     text not null,
  details    jsonb not null default '{}'::jsonb
);
create index if not exists sv_audit_log_owner_idx on sv_audit_log (owner_id, at desc);

-- ============================================================================================================================
-- 2. Fonctions (toutes réservées à la clé de service)
-- ============================================================================================================================

-- Verrou consultatif par compte, tenu jusqu'à la fin de la transaction.
create or replace function sv_lock_owner(p_owner text) returns void language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('sv:' || p_owner, 0));
end $$;

-- Annule une ligne du journal encore en attente et remet la Supervision dans son état d'avant (le crédit est rendu : une ligne
-- annulée ne compte plus).
create or replace function sv_cancel_ledger_row(p_id uuid, p_now timestamptz, p_reason text) returns void language plpgsql as $$
declare l sv_operation_ledger%rowtype;
begin
  select * into l from sv_operation_ledger where id = p_id for update;
  if not found or l.status <> 'pending' then return; end if;
  update sv_operation_ledger set status = 'cancelled', cancelled_at = p_now, details = details || jsonb_build_object('cancel_reason', p_reason) where id = p_id;
  if l.op_type = 'activate_new' then
    update sv_supervisions set state = 'draft', state_changed_at = p_now where id = l.supervision_id and state = 'initializing';
  elsif l.op_type = 'major_change' then
    update sv_supervisions set pending_scope_version_id = null where id = l.supervision_id and pending_scope_version_id = l.scope_version_id;
  end if;
end $$;

-- Une opération jamais confirmée (plantage pendant l'initialisation) libère son crédit au bout de p_ttl_minutes.
create or replace function sv_expire_pending(p_owner text, p_now timestamptz, p_ttl_minutes integer) returns void language plpgsql as $$
declare r record;
begin
  for r in select id from sv_operation_ledger
           where owner_id = p_owner and status = 'pending' and created_at < p_now - make_interval(mins => p_ttl_minutes)
  loop
    perform sv_cancel_ledger_row(r.id, p_now, 'expired');
  end loop;
end $$;

-- Crédit : combien d'opérations comptent dans la fenêtre glissante, et quand le prochain crédit se libère.
create or replace function sv_credit_status(p_owner text, p_credit_limit integer, p_window_days integer, p_now timestamptz default now())
returns jsonb language plpgsql as $$
declare v_used integer; v_next timestamptz;
begin
  select count(*) into v_used from sv_operation_ledger
   where owner_id = p_owner and consumes_credit and status in ('pending', 'committed')
     and coalesce(committed_at, created_at) > p_now - make_interval(days => p_window_days);
  if p_credit_limit is not null and v_used >= p_credit_limit then
    select coalesce(committed_at, created_at) + make_interval(days => p_window_days) into v_next from sv_operation_ledger
     where owner_id = p_owner and consumes_credit and status in ('pending', 'committed')
       and coalesce(committed_at, created_at) > p_now - make_interval(days => p_window_days)
     order by coalesce(committed_at, created_at) asc offset (v_used - p_credit_limit) limit 1;
  end if;
  return jsonb_build_object('used', v_used, 'limit', p_credit_limit, 'available', p_credit_limit is null or v_used < p_credit_limit, 'next_eligible_at', v_next);
end $$;

-- Brouillon : aucun crédit consommé, mais le nombre de brouillons est borné.
create or replace function sv_create_draft(p_owner text, p_name text, p_scope jsonb, p_estimate jsonb, p_max_drafts integer)
returns jsonb language plpgsql as $$
declare v_id uuid; v_ver uuid; v_drafts integer;
begin
  perform sv_lock_owner(p_owner);
  select count(*) into v_drafts from sv_supervisions where owner_id = p_owner and state = 'draft';
  if v_drafts >= p_max_drafts then
    return jsonb_build_object('ok', false, 'code', 'draft_limit_reached', 'limit', p_max_drafts);
  end if;
  insert into sv_supervisions (owner_id, name) values (p_owner, p_name) returning id into v_id;
  insert into sv_scope_versions (supervision_id, version_no, scope, estimate, origin)
    values (v_id, 1, p_scope, coalesce(p_estimate, '{}'::jsonb), 'creation') returning id into v_ver;
  update sv_supervisions set current_scope_version_id = v_ver where id = v_id;
  return jsonb_build_object('ok', true, 'supervision_id', v_id, 'scope_version_id', v_ver);
end $$;

-- Première activation : réserve un crédit (statut « pending ») et passe la Supervision en « initializing ».
-- Le crédit n'est définitivement consommé qu'à sv_confirm_operation ; un échec technique l'annule (sv_cancel_operation).
-- Idempotente : rejouer la même clé (double clic, relance) renvoie le même résultat sans rien consommer de plus.
create or replace function sv_activate(
  p_owner text, p_supervision_id uuid, p_key text,
  p_active_limit integer, p_credit_limit integer, p_window_days integer, p_ttl_minutes integer,
  p_now timestamptz default now())
returns jsonb language plpgsql as $$
declare s sv_supervisions%rowtype; l sv_operation_ledger%rowtype; v_active integer; v_credit jsonb; v_id uuid;
begin
  perform sv_lock_owner(p_owner);
  perform sv_expire_pending(p_owner, p_now, p_ttl_minutes);

  select * into l from sv_operation_ledger where owner_id = p_owner and idempotency_key = p_key;
  if found then
    if l.supervision_id is distinct from p_supervision_id then
      return jsonb_build_object('ok', false, 'code', 'idempotency_conflict');
    end if;
    return jsonb_build_object('ok', true, 'replay', true, 'operation_id', l.id, 'status', l.status);
  end if;

  select * into s from sv_supervisions where id = p_supervision_id and owner_id = p_owner for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if s.state not in ('draft', 'error') then return jsonb_build_object('ok', false, 'code', 'invalid_state', 'state', s.state); end if;

  select count(*) into v_active from sv_supervisions where owner_id = p_owner and state in ('active', 'initializing');
  if v_active >= p_active_limit then
    return jsonb_build_object('ok', false, 'code', 'active_limit_reached', 'limit', p_active_limit);
  end if;

  v_credit := sv_credit_status(p_owner, p_credit_limit, p_window_days, p_now);
  if not (v_credit ->> 'available')::boolean then
    return jsonb_build_object('ok', false, 'code', 'credit_exhausted') || v_credit;
  end if;

  insert into sv_operation_ledger (owner_id, supervision_id, op_type, idempotency_key, status, consumes_credit, scope_version_id, created_at)
    values (p_owner, p_supervision_id, 'activate_new', p_key, 'pending', true, s.current_scope_version_id, p_now) returning id into v_id;
  update sv_supervisions set state = 'initializing', state_changed_at = p_now where id = p_supervision_id;
  return jsonb_build_object('ok', true, 'replay', false, 'operation_id', v_id, 'status', 'pending');
end $$;

-- Confirme une opération en attente (initialisation réussie) : le crédit est consommé, la Supervision devient active ou la refonte
-- majeure entre en vigueur. Idempotente.
create or replace function sv_confirm_operation(p_owner text, p_key text, p_now timestamptz default now())
returns jsonb language plpgsql as $$
declare l sv_operation_ledger%rowtype;
begin
  perform sv_lock_owner(p_owner);
  select * into l from sv_operation_ledger where owner_id = p_owner and idempotency_key = p_key for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if l.status = 'committed' then return jsonb_build_object('ok', true, 'replay', true, 'status', 'committed'); end if;
  if l.status = 'cancelled' then return jsonb_build_object('ok', false, 'code', 'cancelled'); end if;

  update sv_operation_ledger set status = 'committed', committed_at = p_now where id = l.id;
  if l.op_type = 'activate_new' then
    update sv_supervisions set state = 'active', activated_at = coalesce(activated_at, p_now), state_changed_at = p_now,
           reference_scope_version_id = current_scope_version_id
     where id = l.supervision_id;
    update sv_scope_versions set effective_at = p_now where id = l.scope_version_id and effective_at is null;
  elsif l.op_type = 'major_change' then
    update sv_scope_versions set effective_at = p_now where id = l.scope_version_id and effective_at is null;
    update sv_supervisions set current_scope_version_id = l.scope_version_id, reference_scope_version_id = l.scope_version_id,
           pending_scope_version_id = null where id = l.supervision_id;
  end if;
  return jsonb_build_object('ok', true, 'replay', false, 'status', 'committed');
end $$;

-- Annule une opération en attente (échec technique d'activation) : le crédit est rendu et la Supervision revient en brouillon.
create or replace function sv_cancel_operation(p_owner text, p_key text, p_reason text, p_now timestamptz default now())
returns jsonb language plpgsql as $$
declare l sv_operation_ledger%rowtype;
begin
  perform sv_lock_owner(p_owner);
  select * into l from sv_operation_ledger where owner_id = p_owner and idempotency_key = p_key for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if l.status = 'cancelled' then return jsonb_build_object('ok', true, 'replay', true, 'status', 'cancelled'); end if;
  if l.status = 'committed' then return jsonb_build_object('ok', false, 'code', 'already_committed'); end if;
  perform sv_cancel_ledger_row(l.id, p_now, coalesce(p_reason, 'cancelled'));
  return jsonb_build_object('ok', true, 'replay', false, 'status', 'cancelled');
end $$;

-- Pause : arrêt de tout traitement, libère un emplacement actif, consomme un emplacement « en pause » (borné). Aucun crédit.
create or replace function sv_pause(p_owner text, p_supervision_id uuid, p_key text, p_paused_limit integer, p_now timestamptz default now())
returns jsonb language plpgsql as $$
declare s sv_supervisions%rowtype; l sv_operation_ledger%rowtype; v_paused integer;
begin
  perform sv_lock_owner(p_owner);
  select * into l from sv_operation_ledger where owner_id = p_owner and idempotency_key = p_key;
  if found then
    if l.supervision_id is distinct from p_supervision_id then return jsonb_build_object('ok', false, 'code', 'idempotency_conflict'); end if;
    return jsonb_build_object('ok', true, 'replay', true, 'status', l.status);
  end if;
  select * into s from sv_supervisions where id = p_supervision_id and owner_id = p_owner for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if s.state <> 'active' then return jsonb_build_object('ok', false, 'code', 'invalid_state', 'state', s.state); end if;
  select count(*) into v_paused from sv_supervisions where owner_id = p_owner and state = 'paused';
  if v_paused >= p_paused_limit then return jsonb_build_object('ok', false, 'code', 'paused_limit_reached', 'limit', p_paused_limit); end if;
  update sv_supervisions set state = 'paused', paused_at = p_now, state_changed_at = p_now where id = p_supervision_id;
  insert into sv_operation_ledger (owner_id, supervision_id, op_type, idempotency_key, status, consumes_credit, created_at, committed_at)
    values (p_owner, p_supervision_id, 'pause', p_key, 'committed', false, p_now, p_now);
  return jsonb_build_object('ok', true, 'replay', false, 'status', 'committed');
end $$;

-- Réactivation d'une Supervision en pause, inchangée : aucun crédit, mais un emplacement actif doit être libre.
create or replace function sv_resume(p_owner text, p_supervision_id uuid, p_key text, p_active_limit integer, p_now timestamptz default now())
returns jsonb language plpgsql as $$
declare s sv_supervisions%rowtype; l sv_operation_ledger%rowtype; v_active integer;
begin
  perform sv_lock_owner(p_owner);
  select * into l from sv_operation_ledger where owner_id = p_owner and idempotency_key = p_key;
  if found then
    if l.supervision_id is distinct from p_supervision_id then return jsonb_build_object('ok', false, 'code', 'idempotency_conflict'); end if;
    return jsonb_build_object('ok', true, 'replay', true, 'status', l.status);
  end if;
  select * into s from sv_supervisions where id = p_supervision_id and owner_id = p_owner for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if s.state <> 'paused' then return jsonb_build_object('ok', false, 'code', 'invalid_state', 'state', s.state); end if;
  select count(*) into v_active from sv_supervisions where owner_id = p_owner and state in ('active', 'initializing');
  if v_active >= p_active_limit then return jsonb_build_object('ok', false, 'code', 'active_limit_reached', 'limit', p_active_limit); end if;
  update sv_supervisions set state = 'active', paused_at = null, state_changed_at = p_now where id = p_supervision_id;
  insert into sv_operation_ledger (owner_id, supervision_id, op_type, idempotency_key, status, consumes_credit, created_at, committed_at)
    values (p_owner, p_supervision_id, 'resume', p_key, 'committed', false, p_now, p_now);
  return jsonb_build_object('ok', true, 'replay', false, 'status', 'committed');
end $$;

-- Changement de périmètre. La classification (mineur / majeur) est faite par le serveur (lib/supervision/core/majorChange.ts) :
-- mineur = nouvelle version immédiate, sans crédit ; majeur = crédit réservé (« pending »), version en attente jusqu'à confirmation.
create or replace function sv_apply_scope_change(
  p_owner text, p_supervision_id uuid, p_key text,
  p_scope jsonb, p_estimate jsonb, p_is_major boolean, p_reasons text[],
  p_credit_limit integer, p_window_days integer, p_ttl_minutes integer,
  p_now timestamptz default now())
returns jsonb language plpgsql as $$
declare s sv_supervisions%rowtype; l sv_operation_ledger%rowtype; v_credit jsonb; v_no integer; v_ver uuid; v_op uuid; v_major boolean;
begin
  perform sv_lock_owner(p_owner);
  perform sv_expire_pending(p_owner, p_now, p_ttl_minutes);

  select * into l from sv_operation_ledger where owner_id = p_owner and idempotency_key = p_key;
  if found then
    if l.supervision_id is distinct from p_supervision_id then return jsonb_build_object('ok', false, 'code', 'idempotency_conflict'); end if;
    return jsonb_build_object('ok', true, 'replay', true, 'operation_id', l.id, 'status', l.status, 'scope_version_id', l.scope_version_id);
  end if;

  select * into s from sv_supervisions where id = p_supervision_id and owner_id = p_owner for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if s.state not in ('draft', 'error', 'active', 'paused') then return jsonb_build_object('ok', false, 'code', 'invalid_state', 'state', s.state); end if;
  if s.pending_scope_version_id is not null then return jsonb_build_object('ok', false, 'code', 'change_pending'); end if;

  -- Un brouillon ou une Supervision en erreur n'a pas encore de périmètre « de référence » : toute modification est libre.
  v_major := coalesce(p_is_major, false) and s.state in ('active', 'paused');

  if v_major then
    v_credit := sv_credit_status(p_owner, p_credit_limit, p_window_days, p_now);
    if not (v_credit ->> 'available')::boolean then
      return jsonb_build_object('ok', false, 'code', 'credit_exhausted') || v_credit;
    end if;
  end if;

  select coalesce(max(version_no), 0) + 1 into v_no from sv_scope_versions where supervision_id = p_supervision_id;
  insert into sv_scope_versions (supervision_id, version_no, scope, estimate, is_major, major_reasons, origin, effective_at)
    values (p_supervision_id, v_no, p_scope, coalesce(p_estimate, '{}'::jsonb), v_major, coalesce(p_reasons, '{}'),
            case when v_major then 'major_change' else 'minor_change' end,
            case when v_major then null else p_now end)
    returning id into v_ver;

  if v_major then
    insert into sv_operation_ledger (owner_id, supervision_id, op_type, idempotency_key, status, consumes_credit, scope_version_id, created_at)
      values (p_owner, p_supervision_id, 'major_change', p_key, 'pending', true, v_ver, p_now) returning id into v_op;
    update sv_supervisions set pending_scope_version_id = v_ver where id = p_supervision_id;
    return jsonb_build_object('ok', true, 'replay', false, 'major', true, 'operation_id', v_op, 'status', 'pending', 'scope_version_id', v_ver);
  end if;

  insert into sv_operation_ledger (owner_id, supervision_id, op_type, idempotency_key, status, consumes_credit, scope_version_id, created_at, committed_at)
    values (p_owner, p_supervision_id, 'minor_change', p_key, 'committed', false, v_ver, p_now, p_now) returning id into v_op;
  update sv_supervisions set current_scope_version_id = v_ver where id = p_supervision_id;
  return jsonb_build_object('ok', true, 'replay', false, 'major', false, 'operation_id', v_op, 'status', 'committed', 'scope_version_id', v_ver);
end $$;

-- Dépense IA du mois : règlements + réservations encore valides (une réservation jamais réglée expire au bout de p_stale_minutes).
create or replace function sv_ai_spent(p_owner text, p_month_start timestamptz, p_stale_minutes integer, p_now timestamptz default now())
returns numeric language sql stable as $$
  select coalesce(sum(case
           when status = 'settled' then actual_usd
           when status = 'reserved' and created_at > p_now - make_interval(mins => p_stale_minutes) then reserved_usd
           else 0 end), 0)
    from sv_ai_ledger where owner_id = p_owner and created_at >= p_month_start;
$$;

-- Réservation de budget IA, ATOMIQUE : verrou par compte, vérification du plafond et écriture de la réservation dans la même
-- transaction. Deux traitements simultanés ne peuvent donc pas dépasser ensemble le plafond (défaut de l'ancien mécanisme).
-- Réserve de service : une tâche non essentielle n'a droit qu'au plafond moins la réserve. Idempotente par p_op.
create or replace function sv_reserve_ai_budget(
  p_owner text, p_op text, p_supervision uuid, p_job text, p_model text,
  p_estimate numeric, p_cap numeric, p_service_reserve numeric, p_essential boolean,
  p_month_start timestamptz, p_stale_minutes integer default 120, p_now timestamptz default now())
returns jsonb language plpgsql as $$
declare r sv_ai_ledger%rowtype; v_spent numeric; v_cap numeric; v_id uuid;
begin
  perform sv_lock_owner(p_owner);
  select * into r from sv_ai_ledger where owner_id = p_owner and operation_id = p_op;
  if found then return jsonb_build_object('ok', true, 'replay', true, 'ledger_id', r.id, 'status', r.status); end if;

  v_spent := sv_ai_spent(p_owner, p_month_start, p_stale_minutes, p_now);
  if p_cap is not null then
    v_cap := case when p_essential then p_cap else greatest(0, p_cap - coalesce(p_service_reserve, 0)) end;
    if v_spent + p_estimate > v_cap + 0.000000001 then
      return jsonb_build_object('ok', false, 'code', 'budget_exceeded', 'spent', v_spent, 'effective_cap', v_cap, 'remaining', greatest(0, v_cap - v_spent));
    end if;
  end if;

  insert into sv_ai_ledger (owner_id, supervision_id, operation_id, job, model, status, reserved_usd, created_at)
    values (p_owner, p_supervision, p_op, p_job, p_model, 'reserved', p_estimate, p_now) returning id into v_id;
  return jsonb_build_object('ok', true, 'replay', false, 'ledger_id', v_id, 'status', 'reserved', 'spent', v_spent + p_estimate);
end $$;

-- Règle le coût réel d'un appel (remplace la réservation). Ne lève jamais d'erreur métier : le journal ne doit pas bloquer le travail.
create or replace function sv_settle_ai_budget(p_owner text, p_op text, p_actual numeric, p_input integer, p_output integer, p_ok boolean, p_now timestamptz default now())
returns jsonb language plpgsql as $$
declare r sv_ai_ledger%rowtype;
begin
  perform sv_lock_owner(p_owner);
  select * into r from sv_ai_ledger where owner_id = p_owner and operation_id = p_op for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if r.status = 'settled' then return jsonb_build_object('ok', true, 'replay', true, 'status', 'settled'); end if;
  if r.status = 'released' then return jsonb_build_object('ok', false, 'code', 'released'); end if;
  update sv_ai_ledger set status = 'settled', actual_usd = p_actual, input_tokens = p_input, output_tokens = p_output, ok = p_ok, settled_at = p_now where id = r.id;
  return jsonb_build_object('ok', true, 'replay', false, 'status', 'settled');
end $$;

-- Libère une réservation (appel annulé avant d'avoir coûté quoi que ce soit).
create or replace function sv_release_ai_budget(p_owner text, p_op text, p_now timestamptz default now())
returns jsonb language plpgsql as $$
declare r sv_ai_ledger%rowtype;
begin
  perform sv_lock_owner(p_owner);
  select * into r from sv_ai_ledger where owner_id = p_owner and operation_id = p_op for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if r.status = 'released' then return jsonb_build_object('ok', true, 'replay', true, 'status', 'released'); end if;
  if r.status = 'settled' then return jsonb_build_object('ok', false, 'code', 'already_settled'); end if;
  update sv_ai_ledger set status = 'released', settled_at = p_now where id = r.id;
  return jsonb_build_object('ok', true, 'replay', false, 'status', 'released');
end $$;

-- ============================================================================================================================
-- 3. Sécurité : RLS sans politique, aucun droit pour les clés publiques, fonctions réservées à la clé de service
-- ============================================================================================================================

alter table sv_supervisions enable row level security;
alter table sv_scope_versions enable row level security;
alter table sv_operation_ledger enable row level security;
alter table sv_entitlements enable row level security;
alter table sv_grace_periods enable row level security;
alter table sv_ai_ledger enable row level security;
alter table sv_audit_log enable row level security;

revoke all on sv_supervisions, sv_scope_versions, sv_operation_ledger, sv_entitlements, sv_grace_periods, sv_ai_ledger, sv_audit_log from anon, authenticated;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'sv\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
