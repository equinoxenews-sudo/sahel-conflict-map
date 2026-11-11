import { StoreError, adminDb, getSupervision, type Db, type FailureCode, type Outcome } from "../core/store";
import { EMPTY_FILTERS, filtersOf, type AlertFilters } from "./filters";
import { alertKey, type DigestMode, type NotificationRules, type QueuedAlert } from "./rules";
import type { AlertLevel } from "../alerts/rules";

// Supervision V1, Lot 9 : accès serveur aux notifications (tables et fonctions « sv_ », supabase/supervision-lot9-notifications.sql).
// Mêmes règles que core/store.ts : usage serveur seulement, le propriétaire filtre chaque lecture et écriture faites POUR un utilisateur ;
// les fonctions de file (enqueue, claim, finish) ne sont appelées que par les tâches serveur, jamais depuis une saisie du navigateur.
// Aucune IA.

export const DEFAULT_RULES: NotificationRules = { enabled: false, immediateLevels: [], digest: "off", recipient: null, recipientVerified: false, enabledAt: null, filters: { ...EMPTY_FILTERS } };

export type EmailKind = "immediate" | "digest" | "test" | "confirm";
export type EmailStatus = "pending" | "sending" | "sent" | "failed" | "dry_run" | "skipped";

export interface OutboxRow {
  id: string;
  supervisionId: string;
  kind: EmailKind;
  dedupeKey: string;
  toEmail: string;
  payload: Record<string, unknown>;
  attempts: number;
}

export interface JournalEntry {
  id: string;
  kind: EmailKind;
  status: EmailStatus;
  subject: string | null;
  toEmail: string;
  createdAt: string;
  sentAt: string | null;
  error: string | null;
}

function toRules(row: Record<string, unknown> | null | undefined): NotificationRules {
  if (!row) return { ...DEFAULT_RULES };
  return {
    enabled: row.enabled === true,
    immediateLevels: ((row.immediate_levels as string[] | undefined) ?? []).filter((level): level is AlertLevel => level === "critique" || level === "importante"),
    digest: (row.digest as DigestMode | undefined) ?? "off",
    recipient: typeof row.recipient === "string" ? row.recipient : null,
    recipientVerified: row.recipient_verified === true,
    enabledAt: typeof row.enabled_at === "string" ? row.enabled_at : null,
    filters: filtersOf(row.filters),
  };
}

const RULE_COLUMNS = "enabled, immediate_levels, digest, recipient, recipient_verified, enabled_at, filters";

/** Préférences d'une Supervision du propriétaire (valeurs par défaut s'il n'en a pas encore) ; null si elle n'existe pas pour lui. */
export async function getRules(ownerId: string, supervisionId: string, client: Db = adminDb()): Promise<NotificationRules | null> {
  const owned = await getSupervision(ownerId, supervisionId, client);
  if (!owned) return null;
  const { data, error } = await client.from("sv_notification_rules").select(RULE_COLUMNS).eq("supervision_id", supervisionId).maybeSingle();
  if (error) throw new StoreError(`Lecture des notifications impossible : ${error.message}`, error);
  return toRules(data as Record<string, unknown> | null);
}

export async function setRules(
  ownerId: string,
  supervisionId: string,
  input: { enabled: boolean; immediateLevels: AlertLevel[]; digest: DigestMode; recipient: string | null; filters?: AlertFilters },
  now?: Date,
  client: Db = adminDb(),
): Promise<Outcome<{ rules: NotificationRules }>> {
  const { data, error } = await client.rpc("sv_set_notification_rules", {
    p_owner: ownerId,
    p_supervision_id: supervisionId,
    p_enabled: input.enabled,
    p_levels: input.immediateLevels,
    p_digest: input.digest,
    p_recipient: input.recipient,
    p_filters: input.filters ?? EMPTY_FILTERS,
    ...(now ? { p_now: now.toISOString() } : {}),
  });
  if (error) throw new StoreError(`sv_set_notification_rules : ${error.message}`, error);
  const body = (data ?? {}) as Record<string, unknown>;
  if (body.ok === true) return { ok: true, replay: false, rules: toRules(body.rules as Record<string, unknown>) };
  const { ok: _ok, code, ...detail } = body;
  void _ok;
  return { ok: false, code: (code as FailureCode) ?? "not_found", detail };
}

/** Confirme l'adresse après vérification de la signature du lien ; ne réussit que si l'adresse est encore celle des préférences. */
export async function confirmRecipient(supervisionId: string, email: string, now?: Date, client: Db = adminDb()): Promise<{ ok: true; confirmed: boolean } | { ok: false }> {
  const { data, error } = await client.rpc("sv_confirm_recipient", { p_supervision_id: supervisionId, p_email: email, ...(now ? { p_now: now.toISOString() } : {}) });
  if (error) throw new StoreError(`sv_confirm_recipient : ${error.message}`, error);
  const body = (data ?? {}) as Record<string, unknown>;
  return body.ok === true ? { ok: true, confirmed: body.confirmed === true } : { ok: false };
}

export async function enqueueEmail(
  supervisionId: string,
  kind: EmailKind,
  dedupeKey: string,
  to: string,
  payload: Record<string, unknown>,
  sendAfter: Date,
  now: Date,
  client: Db = adminDb(),
): Promise<{ inserted: boolean }> {
  const { data, error } = await client.rpc("sv_enqueue_email", {
    p_supervision_id: supervisionId,
    p_kind: kind,
    p_dedupe_key: dedupeKey,
    p_to: to,
    p_payload: payload,
    p_send_after: sendAfter.toISOString(),
    p_now: now.toISOString(),
  });
  if (error) throw new StoreError(`sv_enqueue_email : ${error.message}`, error);
  return { inserted: (data as { inserted?: boolean } | null)?.inserted === true };
}

/** Réserve les messages dus ; `only` restreint à certaines Supervisions (tests, demandes de l’utilisateur). */
export async function claimDue(limit: number, now: Date, client: Db = adminDb(), only?: readonly string[]): Promise<OutboxRow[]> {
  const { data, error } = await client.rpc("sv_claim_due_emails", { p_limit: limit, p_now: now.toISOString(), ...(only ? { p_only: [...only] } : {}) });
  if (error) throw new StoreError(`sv_claim_due_emails : ${error.message}`, error);
  const rows = ((data as { rows?: Record<string, unknown>[] } | null)?.rows ?? []) as Record<string, unknown>[];
  return rows.map((row) => ({
    id: String(row.id),
    supervisionId: String(row.supervision_id),
    kind: row.kind as EmailKind,
    dedupeKey: String(row.dedupe_key),
    toEmail: String(row.to_email),
    payload: (row.payload ?? {}) as Record<string, unknown>,
    attempts: Number(row.attempts ?? 1),
  }));
}

export async function finishEmail(id: string, status: "sent" | "failed" | "dry_run" | "skipped", detail: { providerId?: string | null; error?: string | null; subject?: string | null; final?: boolean }, now: Date, client: Db = adminDb()): Promise<void> {
  const { error } = await client.rpc("sv_finish_email", { p_id: id, p_status: status, p_provider_id: detail.providerId ?? null, p_error: detail.error ?? null, p_subject: detail.subject ?? null, p_now: now.toISOString(), p_final: detail.final === true });
  if (error) throw new StoreError(`sv_finish_email : ${error.message}`, error);
}

/** Alertes déjà mises en file ou envoyées (clés de déduplication) pour une Supervision. */
export async function alreadyQueued(supervisionId: string, keys: readonly string[], client: Db = adminDb()): Promise<Set<string>> {
  if (keys.length === 0) return new Set();
  const { data, error } = await client.from("sv_email_outbox").select("dedupe_key").eq("supervision_id", supervisionId).in("dedupe_key", [...keys]);
  if (error) throw new StoreError(`Lecture de la file impossible : ${error.message}`, error);
  return new Set(((data ?? []) as { dedupe_key: string }[]).map((row) => row.dedupe_key));
}

export async function hasEmail(supervisionId: string, dedupeKey: string, client: Db = adminDb()): Promise<boolean> {
  const { data, error } = await client.from("sv_email_outbox").select("id").eq("supervision_id", supervisionId).eq("dedupe_key", dedupeKey).maybeSingle();
  if (error) throw new StoreError(`Lecture de la file impossible : ${error.message}`, error);
  return data !== null;
}

/** Journal d'envoi d'une Supervision du propriétaire, du plus récent au plus ancien ; null si elle n'existe pas pour lui. */
export async function listJournal(ownerId: string, supervisionId: string, limit = 12, client: Db = adminDb()): Promise<JournalEntry[] | null> {
  const owned = await getSupervision(ownerId, supervisionId, client);
  if (!owned) return null;
  const { data, error } = await client.from("sv_email_outbox").select("id, kind, status, subject, to_email, created_at, sent_at, error").eq("supervision_id", supervisionId).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new StoreError(`Lecture du journal impossible : ${error.message}`, error);
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    kind: row.kind as EmailKind,
    status: row.status as EmailStatus,
    subject: typeof row.subject === "string" ? row.subject : null,
    toEmail: String(row.to_email),
    createdAt: String(row.created_at),
    sentAt: typeof row.sent_at === "string" ? row.sent_at : null,
    error: typeof row.error === "string" ? row.error : null,
  }));
}

/** Nombre de messages de ces types demandés par l'utilisateur depuis `since` : sert à limiter les demandes répétées. */
export async function recentCount(supervisionId: string, kinds: readonly EmailKind[], since: Date, client: Db = adminDb()): Promise<number> {
  const { count, error } = await client.from("sv_email_outbox").select("id", { count: "exact", head: true }).eq("supervision_id", supervisionId).in("kind", [...kinds]).gte("created_at", since.toISOString());
  if (error) throw new StoreError(`Lecture de la file impossible : ${error.message}`, error);
  return count ?? 0;
}

export interface Notifiable {
  supervisionId: string;
  ownerId: string;
  name: string;
  state: string;
  pausedAt: string | null;
  scopeVersionId: string | null;
  rules: NotificationRules;
}

/** Supervisions dont les préférences sont activées ET l'adresse confirmée (l'état « actif » est vérifié ensuite, à l'envoi aussi). */
export async function listNotifiable(limit: number, client: Db = adminDb(), only?: readonly string[]): Promise<Notifiable[]> {
  const base = client.from("sv_notification_rules").select(`supervision_id, ${RULE_COLUMNS}`).eq("enabled", true).eq("recipient_verified", true);
  const { data: rules, error } = await (only ? base.in("supervision_id", [...only]) : base).limit(limit);
  if (error) throw new StoreError(`Lecture des notifications impossible : ${error.message}`, error);
  const rows = (rules ?? []) as Record<string, unknown>[];
  if (rows.length === 0) return [];
  const { data: sups, error: supError } = await client.from("sv_supervisions").select("id, owner_id, name, state, paused_at, current_scope_version_id").in("id", rows.map((row) => String(row.supervision_id)));
  if (supError) throw new StoreError(`Lecture des Supervisions impossible : ${supError.message}`, supError);
  const byId = new Map(((sups ?? []) as Record<string, unknown>[]).map((sup) => [String(sup.id), sup]));
  return rows.flatMap((row) => {
    const sup = byId.get(String(row.supervision_id));
    if (!sup) return [];
    return [{ supervisionId: String(sup.id), ownerId: String(sup.owner_id), name: String(sup.name), state: String(sup.state), pausedAt: typeof sup.paused_at === "string" ? sup.paused_at : null, scopeVersionId: typeof sup.current_scope_version_id === "string" ? sup.current_scope_version_id : null, rules: toRules(row) }];
  });
}

/** Supervisions (état, nom, propriétaire) pour des identifiants donnés : sert à l'envoi, qui revérifie l'état au dernier moment. */
export async function supervisionsById(ids: readonly string[], client: Db = adminDb()): Promise<Map<string, { name: string; state: string; ownerId: string }>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await client.from("sv_supervisions").select("id, owner_id, name, state").in("id", [...ids]);
  if (error) throw new StoreError(`Lecture des Supervisions impossible : ${error.message}`, error);
  return new Map(((data ?? []) as Record<string, unknown>[]).map((row) => [String(row.id), { name: String(row.name), state: String(row.state), ownerId: String(row.owner_id) }]));
}

/** Préférences actuelles par Supervision (sans contrôle de propriétaire : usage interne de l'envoi). */
export async function rulesById(ids: readonly string[], client: Db = adminDb()): Promise<Map<string, NotificationRules>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await client.from("sv_notification_rules").select(`supervision_id, ${RULE_COLUMNS}`).in("supervision_id", [...ids]);
  if (error) throw new StoreError(`Lecture des notifications impossible : ${error.message}`, error);
  return new Map(((data ?? []) as Record<string, unknown>[]).map((row) => [String(row.supervision_id), toRules(row)]));
}

export const payloadAlert = (alert: QueuedAlert): Record<string, unknown> => ({ ...alert });
export { alertKey };
