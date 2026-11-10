import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tier } from "../../accounts";
import { getSupabaseAdmin } from "../../supabaseAdmin";
import { decideReservation, monthStartUtc, monthlyCapUsd, serviceReserveUsd } from "./budget";
import { resolveAccess, type AccessProfile, type EntitlementRow } from "./entitlements";
import { isState, type SupervisionState } from "./lifecycle";
import { classifyScopeChange, type Classification, type ScopeSnapshot } from "./majorChange";
import { getPolicy, type SupervisionPolicy } from "./policy";

// Supervision V1, Lot 1 : accès serveur au modèle métier (tables et fonctions « sv_ », supabase/supervision-lot1.sql).
// RÈGLES DE SÉCURITÉ :
//  - ce module n'est utilisé que côté serveur (clé de service) ; jamais importé par un composant client ;
//  - TOUTES les fonctions prennent le propriétaire en premier argument et filtrent dessus : une Supervision d'un autre compte n'est
//    jamais lue ni modifiée, même si on en connaît l'identifiant (la clé de service contourne la RLS : l'isolation est ici et dans
//    les fonctions SQL, testée par tests/integration) ;
//  - les quotas (emplacements, crédits, budget IA) sont décidés par la base, de façon atomique : ni ce module ni React ne les
//    contrôlent seuls.

export class StoreError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
  }
}

/** Codes d'échec métier renvoyés par les fonctions SQL ou par les contrôles d'accès de ce module. */
export type FailureCode =
  | "not_found"
  | "invalid_state"
  | "active_limit_reached"
  | "paused_limit_reached"
  | "draft_limit_reached"
  | "credit_exhausted"
  | "change_pending"
  | "idempotency_conflict"
  | "cancelled"
  | "already_committed"
  | "budget_exceeded"
  | "released"
  | "already_settled"
  | "access_denied"
  | "revision_conflict"
  | "read_only"
  | "already_running"
  | "too_soon";

export type Outcome<T = Record<string, never>> = ({ ok: true; replay: boolean } & T) | { ok: false; code: FailureCode; detail: Record<string, unknown> };

type Db = Pick<SupabaseClient, "rpc" | "from">;

function db(): Db {
  return getSupabaseAdmin();
}

async function call<T = Record<string, never>>(client: Db, fn: string, args: Record<string, unknown>): Promise<Outcome<T>> {
  const { data, error } = await client.rpc(fn, args);
  if (error) throw new StoreError(`${fn} : ${error.message}`, error);
  const body = (data ?? {}) as Record<string, unknown>;
  if (body.ok === true) {
    const { ok: _ok, replay, ...rest } = body;
    void _ok;
    return { ok: true, replay: replay === true, ...(rest as T) };
  }
  const { ok: _ok, code, ...detail } = body;
  void _ok;
  return { ok: false, code: (code as FailureCode) ?? "not_found", detail };
}

function denied(access: AccessProfile): Outcome<never> {
  return { ok: false, code: "access_denied", detail: { mode: access.mode, reason: access.reason, plan: access.plan } };
}

// --- Droits -------------------------------------------------------------------------------------------------------------

interface EntitlementDbRow {
  plan: Tier;
  active_limit: number | null;
  paused_limit: number | null;
  credit_limit: number | null;
  credit_unlimited: boolean;
  effective_at: string;
  expires_at: string | null;
}

/** Droits effectifs d'un compte : lignes sv_entitlements (posées à la main) ou, à défaut, l'offre du compte. */
export async function loadAccess(ownerId: string, accountTier: Tier, now: Date = new Date(), policy: SupervisionPolicy = getPolicy(), client: Db = db()): Promise<AccessProfile> {
  const { data, error } = await client.from("sv_entitlements").select("plan, active_limit, paused_limit, credit_limit, credit_unlimited, effective_at, expires_at").eq("owner_id", ownerId);
  if (error) throw new StoreError(`Droits illisibles : ${error.message}`, error);
  const rows: EntitlementRow[] = ((data ?? []) as EntitlementDbRow[]).map((row) => ({
    plan: row.plan,
    activeLimit: row.active_limit,
    pausedLimit: row.paused_limit,
    creditLimit: row.credit_limit,
    creditUnlimited: row.credit_unlimited,
    effectiveAt: new Date(row.effective_at),
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
  }));
  return resolveAccess(accountTier, rows, policy, now);
}

// --- Lecture (toujours filtrée par propriétaire) --------------------------------------------------------------------------

export interface SupervisionRecord {
  id: string;
  ownerId: string;
  name: string;
  state: SupervisionState;
  currentScopeVersionId: string | null;
  referenceScopeVersionId: string | null;
  pendingScopeVersionId: string | null;
  createdAt: string;
  activatedAt: string | null;
  pausedAt: string | null;
}

interface SupervisionDbRow {
  id: string;
  owner_id: string;
  name: string;
  state: string;
  current_scope_version_id: string | null;
  reference_scope_version_id: string | null;
  pending_scope_version_id: string | null;
  created_at: string;
  activated_at: string | null;
  paused_at: string | null;
}

const COLUMNS = "id, owner_id, name, state, current_scope_version_id, reference_scope_version_id, pending_scope_version_id, created_at, activated_at, paused_at";

function toRecord(row: SupervisionDbRow): SupervisionRecord {
  if (!isState(row.state)) throw new StoreError(`État inconnu en base : ${row.state}`);
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    state: row.state,
    currentScopeVersionId: row.current_scope_version_id,
    referenceScopeVersionId: row.reference_scope_version_id,
    pendingScopeVersionId: row.pending_scope_version_id,
    createdAt: row.created_at,
    activatedAt: row.activated_at,
    pausedAt: row.paused_at,
  };
}

export async function listSupervisions(ownerId: string, client: Db = db()): Promise<SupervisionRecord[]> {
  const { data, error } = await client.from("sv_supervisions").select(COLUMNS).eq("owner_id", ownerId).neq("state", "deleted").order("created_at", { ascending: false });
  if (error) throw new StoreError(`Lecture impossible : ${error.message}`, error);
  return ((data ?? []) as SupervisionDbRow[]).map(toRecord);
}

export async function getSupervision(ownerId: string, id: string, client: Db = db()): Promise<SupervisionRecord | null> {
  const { data, error } = await client.from("sv_supervisions").select(COLUMNS).eq("owner_id", ownerId).eq("id", id).maybeSingle();
  if (error) throw new StoreError(`Lecture impossible : ${error.message}`, error);
  return data ? toRecord(data as SupervisionDbRow) : null;
}

/** Instantané (périmètre + estimation) d'une version, seulement si la Supervision appartient bien au propriétaire. */
export async function getScopeSnapshot(ownerId: string, supervisionId: string, versionId: string, client: Db = db()): Promise<ScopeSnapshot | null> {
  const owned = await getSupervision(ownerId, supervisionId, client);
  if (!owned) return null;
  const { data, error } = await client.from("sv_scope_versions").select("scope, estimate").eq("supervision_id", supervisionId).eq("id", versionId).maybeSingle();
  if (error) throw new StoreError(`Lecture impossible : ${error.message}`, error);
  return data ? { scope: (data as { scope: ScopeSnapshot["scope"] }).scope, estimate: (data as { estimate: ScopeSnapshot["estimate"] }).estimate } : null;
}

// --- Écriture : cycle de vie ---------------------------------------------------------------------------------------------

export async function createDraft(
  ownerId: string,
  name: string,
  snapshot: ScopeSnapshot,
  policy: SupervisionPolicy = getPolicy(),
  client: Db = db(),
): Promise<Outcome<{ supervision_id: string; scope_version_id: string }>> {
  return call(client, "sv_create_draft", { p_owner: ownerId, p_name: name, p_scope: snapshot.scope, p_estimate: snapshot.estimate, p_max_drafts: policy.maxDraftsPerOwner });
}

/**
 * Première activation d'une Supervision : réserve un crédit (statut « pending »). L'appelant lance ensuite l'initialisation puis
 * appelle confirmOperation (succès) ou cancelOperation (échec technique : le crédit est rendu). `key` rend l'opération idempotente.
 */
export async function activate(ownerId: string, supervisionId: string, key: string, access: AccessProfile, now?: Date, policy: SupervisionPolicy = getPolicy(), client: Db = db()): Promise<Outcome<{ operation_id: string; status: string }>> {
  if (access.mode !== "full") return denied(access);
  return call(client, "sv_activate", {
    p_owner: ownerId,
    p_supervision_id: supervisionId,
    p_key: key,
    p_active_limit: access.activeLimit,
    p_credit_limit: access.creditLimit,
    p_window_days: policy.creditWindowDays,
    p_ttl_minutes: policy.pendingTtlMinutes,
    ...(now ? { p_now: now.toISOString() } : {}),
  });
}

export async function confirmOperation(ownerId: string, key: string, now?: Date, client: Db = db()): Promise<Outcome<{ status: string }>> {
  return call(client, "sv_confirm_operation", { p_owner: ownerId, p_key: key, ...(now ? { p_now: now.toISOString() } : {}) });
}

export async function cancelOperation(ownerId: string, key: string, reason: string, now?: Date, client: Db = db()): Promise<Outcome<{ status: string }>> {
  return call(client, "sv_cancel_operation", { p_owner: ownerId, p_key: key, p_reason: reason, ...(now ? { p_now: now.toISOString() } : {}) });
}

/** Pause : arrête collecte, IA et notifications ; libère un emplacement actif ; ne coûte aucun crédit. Permise même en lecture seule. */
export async function pause(ownerId: string, supervisionId: string, key: string, access: AccessProfile, now?: Date, client: Db = db()): Promise<Outcome<{ status: string }>> {
  if (access.mode === "none") return denied(access);
  return call(client, "sv_pause", { p_owner: ownerId, p_supervision_id: supervisionId, p_key: key, p_paused_limit: access.pausedLimit, ...(now ? { p_now: now.toISOString() } : {}) });
}

/** Réactivation d'une Supervision en pause, inchangée : aucun crédit, un emplacement actif doit être libre. */
export async function resume(ownerId: string, supervisionId: string, key: string, access: AccessProfile, now?: Date, client: Db = db()): Promise<Outcome<{ status: string }>> {
  if (access.mode !== "full") return denied(access);
  return call(client, "sv_resume", { p_owner: ownerId, p_supervision_id: supervisionId, p_key: key, p_active_limit: access.activeLimit, ...(now ? { p_now: now.toISOString() } : {}) });
}

// --- Écriture : changements de périmètre ----------------------------------------------------------------------------------

export interface ScopeChangeResult {
  classification: Classification;
  outcome: Outcome<{ operation_id: string; status: string; major: boolean; scope_version_id: string }>;
}

/**
 * Propose un nouveau périmètre : le serveur le compare au périmètre de RÉFÉRENCE (dernière création ou refonte majeure, jamais à la
 * version précédente), décide s'il est majeur, puis la base applique atomiquement (version immédiate si mineur ; crédit réservé et
 * version en attente si majeur). Les estimations insuffisamment fiables sont renvoyées dans `classification.warnings` : à montrer à
 * l'utilisateur AVANT de confirmer.
 */
/**
 * Classe un périmètre proposé (mineur / majeur, avertissements) SANS rien écrire : sert à l'aperçu avant enregistrement.
 * null si la Supervision n'existe pas pour ce propriétaire.
 */
export async function classifyProposal(
  ownerId: string,
  supervisionId: string,
  next: ScopeSnapshot,
  policy: SupervisionPolicy = getPolicy(),
  client: Db = db(),
): Promise<{ supervision: SupervisionRecord; classification: Classification } | null> {
  const supervision = await getSupervision(ownerId, supervisionId, client);
  if (!supervision) return null;
  // Sans périmètre de référence (brouillon), tout changement est libre : on compare quand même au périmètre courant pour l'historique.
  const referenceId = supervision.referenceScopeVersionId ?? supervision.currentScopeVersionId;
  const reference = referenceId ? await getScopeSnapshot(ownerId, supervisionId, referenceId, client) : null;
  const classification: Classification = reference
    ? classifyScopeChange(reference, next, policy.majorChange)
    : { major: false, reasons: [], warnings: [], volumeIncrease: null, costIncrease: null };
  return { supervision, classification };
}

export async function proposeScopeChange(
  ownerId: string,
  supervisionId: string,
  key: string,
  next: ScopeSnapshot,
  access: AccessProfile,
  now?: Date,
  policy: SupervisionPolicy = getPolicy(),
  client: Db = db(),
): Promise<ScopeChangeResult | Outcome<never>> {
  if (access.mode !== "full") return denied(access);
  const proposal = await classifyProposal(ownerId, supervisionId, next, policy, client);
  if (!proposal) return { ok: false, code: "not_found", detail: {} };
  const { classification } = proposal;
  const outcome = await call<{ operation_id: string; status: string; major: boolean; scope_version_id: string }>(client, "sv_apply_scope_change", {
    p_owner: ownerId,
    p_supervision_id: supervisionId,
    p_key: key,
    p_scope: next.scope,
    p_estimate: next.estimate,
    p_is_major: classification.major,
    p_reasons: classification.reasons,
    p_credit_limit: access.creditLimit,
    p_window_days: policy.creditWindowDays,
    p_ttl_minutes: policy.pendingTtlMinutes,
    ...(now ? { p_now: now.toISOString() } : {}),
  });
  return { classification, outcome };
}

export async function creditStatus(ownerId: string, access: AccessProfile, now?: Date, policy: SupervisionPolicy = getPolicy(), client: Db = db()) {
  const { data, error } = await client.rpc("sv_credit_status", { p_owner: ownerId, p_credit_limit: access.creditLimit, p_window_days: policy.creditWindowDays, ...(now ? { p_now: now.toISOString() } : {}) });
  if (error) throw new StoreError(`Crédits illisibles : ${error.message}`, error);
  const body = data as { used: number; limit: number | null; available: boolean; next_eligible_at: string | null };
  return { used: body.used, limit: body.limit, available: body.available, nextEligibleAt: body.next_eligible_at ? new Date(body.next_eligible_at) : null };
}

// --- Budget IA (atomique) -----------------------------------------------------------------------------------------------

export interface BudgetRequest {
  ownerId: string;
  tier: Tier;
  /** Identifiant unique de l'appel : rejouer la même réservation ne coûte rien de plus. */
  operationId: string;
  supervisionId: string | null;
  job: string;
  model: string;
  estimateUsd: number;
  /** Tâche essentielle (synthèse programmée) : peut puiser dans la réserve de service. */
  essential: boolean;
}

/** Réserve le budget d'un appel IA AVANT de l'émettre. Refus (budget_exceeded) : l'appel ne doit pas être fait ; la lecture des archives reste possible. */
export async function reserveAiBudget(request: BudgetRequest, now: Date = new Date(), policy: SupervisionPolicy = getPolicy(), client: Db = db()): Promise<Outcome<{ ledger_id: string; status: string }>> {
  const cap = monthlyCapUsd(policy, request.tier);
  return call(client, "sv_reserve_ai_budget", {
    p_owner: request.ownerId,
    p_op: request.operationId,
    p_supervision: request.supervisionId,
    p_job: request.job,
    p_model: request.model,
    p_estimate: request.estimateUsd,
    p_cap: cap,
    p_service_reserve: serviceReserveUsd(policy, cap),
    p_essential: request.essential,
    p_month_start: monthStartUtc(now).toISOString(),
    p_now: now.toISOString(),
  });
}

/** Règle le coût réel : remplace la réservation. Ne doit jamais bloquer le travail : une erreur est journalisée, pas relancée. */
export async function settleAiBudget(ownerId: string, operationId: string, outcome: { costUsd: number; inputTokens: number; outputTokens: number; ok: boolean }, client: Db = db()): Promise<Outcome<{ status: string }>> {
  return call(client, "sv_settle_ai_budget", { p_owner: ownerId, p_op: operationId, p_actual: outcome.costUsd, p_input: outcome.inputTokens, p_output: outcome.outputTokens, p_ok: outcome.ok });
}

export async function releaseAiBudget(ownerId: string, operationId: string, client: Db = db()): Promise<Outcome<{ status: string }>> {
  return call(client, "sv_release_ai_budget", { p_owner: ownerId, p_op: operationId });
}

export { decideReservation };

/** Pour les modules voisins du même modèle (tableaux de bord…) : appel d'une fonction SQL avec le même format de résultat. */
export { call as callRpc, db as adminDb };
export type { Db };
