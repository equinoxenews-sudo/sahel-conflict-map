-- Supervision V1, Lot 2 intégré : tableau de bord enregistré côté serveur, avec contrôle de révision.
-- À coller dans le SQL Editor de la PRÉPRODUCTION (equinoxe-staging) UNIQUEMENT, APRÈS supabase/supervision-lot1.sql.
-- Tout est AJOUTÉ (préfixe « sv_ »). Peut être exécuté plusieurs fois sans dommage.

-- Le tableau de bord d'une Supervision : modules, dispositions (ordinateur, tablette, téléphone) et filtres globaux, tels que les
-- produit l'éditeur (lib/supervision/dashboard/state.ts). Une seule ligne par Supervision, avec un numéro de RÉVISION.
create table if not exists sv_dashboards (
  supervision_id  uuid primary key references sv_supervisions (id) on delete cascade,
  owner_id        text not null,
  revision        integer not null default 0 check (revision >= 0),
  state           jsonb not null default '{}'::jsonb,
  saved_at        timestamptz not null default now()
);

-- Dernières révisions conservées : « restauration du dernier état fiable en cas de conflit ou de panne ».
create table if not exists sv_dashboard_revisions (
  supervision_id  uuid not null references sv_supervisions (id) on delete cascade,
  revision        integer not null,
  state           jsonb not null,
  saved_at        timestamptz not null default now(),
  primary key (supervision_id, revision)
);

-- Enregistrement avec CONTRÔLE DE RÉVISION (verrouillage optimiste) : on n'écrit que si la révision que le client avait lue est
-- toujours la révision courante. Sinon (autre onglet, autre appareil), rien n'est écrasé : la fonction renvoie « revision_conflict »
-- avec la version du serveur, et c'est à l'utilisateur de choisir.
create or replace function sv_save_dashboard(
  p_owner text, p_supervision_id uuid, p_expected_revision integer, p_state jsonb,
  p_keep integer default 20, p_now timestamptz default now())
returns jsonb language plpgsql as $$
declare s sv_supervisions%rowtype; d sv_dashboards%rowtype; v_current integer; v_next integer; v_has boolean;
begin
  perform sv_lock_owner(p_owner);
  select * into s from sv_supervisions where id = p_supervision_id and owner_id = p_owner for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  -- Lecture seule : grâce, suppression en cours, supprimée. (Brouillon, active, en pause, en erreur : le tableau reste modifiable.)
  if s.state in ('read_only_grace', 'pending_deletion', 'deleted') then
    return jsonb_build_object('ok', false, 'code', 'read_only', 'state', s.state);
  end if;

  select * into d from sv_dashboards where supervision_id = p_supervision_id for update;
  v_has := found;
  v_current := coalesce(d.revision, 0);
  if p_expected_revision is distinct from v_current then
    return jsonb_build_object('ok', false, 'code', 'revision_conflict', 'current_revision', v_current,
                              'current_state', case when v_has then d.state else null end, 'saved_at', d.saved_at);
  end if;

  v_next := v_current + 1;
  insert into sv_dashboards (supervision_id, owner_id, revision, state, saved_at)
    values (p_supervision_id, p_owner, v_next, p_state, p_now)
    on conflict (supervision_id) do update set revision = excluded.revision, state = excluded.state, saved_at = excluded.saved_at;
  insert into sv_dashboard_revisions (supervision_id, revision, state, saved_at) values (p_supervision_id, v_next, p_state, p_now);
  delete from sv_dashboard_revisions where supervision_id = p_supervision_id and revision <= v_next - p_keep;
  return jsonb_build_object('ok', true, 'revision', v_next, 'saved_at', p_now);
end $$;

-- Sécurité : comme le reste du modèle (RLS sans politique, droits retirés aux clés publiques, fonctions réservées à la clé de service).
alter table sv_dashboards enable row level security;
alter table sv_dashboard_revisions enable row level security;
revoke all on sv_dashboards, sv_dashboard_revisions from anon, authenticated;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'sv\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
