import { buildAlerts, effectiveStatus, type StoredDecision } from "../alerts/rules";
import { listAlertStates } from "../alerts/store";
import { adminDb, getScopeSnapshot, getSupervision, type Db } from "../core/store";
import { loadBoardData } from "../data/board";
import { confirmationEmail, digestEmail, immediateEmail, testEmail, type EmailMessage } from "./message";
import { matchesFilters } from "./filters";
import { chooseProvider, type EmailProvider, type FetchLike } from "./provider";
import { ENQUEUE_PER_RUN_MAX, IMMEDIATE_DELAY_MINUTES, alertKey, canNotify, digestDue, selectAlertsToQueue, type QueuedAlert } from "./rules";
import { alreadyQueued, claimDue, enqueueEmail, finishEmail, hasEmail, listNotifiable, recentCount, rulesById, supervisionsById, type OutboxRow } from "./store";
import { TOKEN_TTL_HOURS, notifyTokenSecret, signConfirmToken } from "./token";

// Supervision V1, Lot 9 : moteur des notifications par e-mail (tâche planifiée et demandes de l'utilisateur). Aucune IA, aucun coût
// d'IA. Deux temps, sans jamais dépendre l'un de l'autre :
//  1. MISE EN FILE (queueAlerts) : pour chaque Supervision active aux notifications activées et à l'adresse confirmée, les alertes
//     nouvelles (critique ou importante, plus récentes que l'activation, pas encore tranchées par l'utilisateur) sont écrites dans la
//     file avec une temporisation ; le digest du jour ou de la semaine est écrit une seule fois. La base refuse tout doublon.
//  2. ENVOI (sendDue) : les messages dus sont réservés atomiquement, REGROUPÉS (toutes les alertes d'une Supervision dans la même
//     fenêtre partent dans UN seul e-mail), l'état de la Supervision est revérifié au dernier moment (une pause ou la lecture seule
//     annule les messages déjà en file), puis le fournisseur est appelé. Chaque résultat est écrit dans le journal.

export interface NotifyDeps {
  db: Db;
  provider: EmailProvider;
  now: Date;
  siteUrl: string;
  secret: string;
}

export interface NotifyReport {
  supervisions: number;
  queued: number;
  digests: number;
  sent: number;
  dryRun: number;
  failed: number;
  skipped: number;
  errors: { id: string; reason: string }[];
}

export function emptyReport(): NotifyReport {
  return { supervisions: 0, queued: 0, digests: 0, sent: 0, dryRun: 0, failed: 0, skipped: 0, errors: [] };
}

export function defaultDeps(now: Date = new Date()): NotifyDeps & { mode: "live" | "dry_run"; reason: string | null } {
  const env = { EMAIL_MODE: process.env.EMAIL_MODE, RESEND_API_KEY: process.env.RESEND_API_KEY, EMAIL_FROM: process.env.EMAIL_FROM, EMAIL_TEST_RECIPIENTS: process.env.EMAIL_TEST_RECIPIENTS };
  const choice = chooseProvider(env, process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", fetch as unknown as FetchLike);
  return { db: adminDb(), provider: choice.provider, mode: choice.mode, reason: choice.reason, now, siteUrl: (process.env.SITE_URL ?? "https://equinoxe.news").replace(/\/+$/, ""), secret: notifyTokenSecret() };
}

const manageUrl = (deps: NotifyDeps, supervisionId: string) => `${deps.siteUrl}/mon-espace/supervision/${supervisionId}`;
const minutes = (date: Date, count: number) => new Date(date.getTime() + count * 60_000);

// --- 1. Mise en file ------------------------------------------------------------------------------------------------------

export async function queueAlerts(deps: NotifyDeps, report: NotifyReport, options: { limit?: number; only?: readonly string[] } = {}): Promise<void> {
  const targets = await listNotifiable(options.limit ?? 100, deps.db, options.only);
  for (const target of targets) {
    try {
      // Seule une Supervision ACTIVE génère des notifications (brouillon, pause, lecture seule : rien).
      if (!canNotify(target.state, target.rules) || !target.scopeVersionId || !target.rules.recipient) continue;
      report.supervisions += 1;
      const snapshot = await getScopeSnapshot(target.ownerId, target.supervisionId, target.scopeVersionId, deps.db);
      if (!snapshot) continue;
      const data = await loadBoardData(snapshot, deps.now, deps.db, target.supervisionId);
      const decisions = new Map<string, StoredDecision>();
      for (const row of (await listAlertStates(target.ownerId, target.supervisionId, deps.db)) ?? []) decisions.set(row.eventRef, { status: row.status, level: row.level });
      const alerts = buildAlerts(data.events, { state: target.state, pausedAt: target.pausedAt });

      const known = await alreadyQueued(target.supervisionId, alerts.map((alert) => alertKey(alert.id, alert.level)), deps.db);
      for (const alert of selectAlertsToQueue(alerts, target.rules, decisions, known).slice(0, ENQUEUE_PER_RUN_MAX)) {
        const { inserted } = await enqueueEmail(target.supervisionId, "immediate", alertKey(alert.eventRef, alert.level), target.rules.recipient, { alert }, minutes(deps.now, IMMEDIATE_DELAY_MINUTES), deps.now, deps.db);
        if (inserted) report.queued += 1;
      }

      const slot = digestDue(target.rules.digest, deps.now);
      if (slot && !(await hasEmail(target.supervisionId, slot.key, deps.db))) {
        const since = deps.now.getTime() - slot.days * 86_400_000;
        const inPeriod = alerts.filter((alert) => Date.parse(alert.event.at) >= since && effectiveStatus(alert, decisions.get(alert.id)) !== "hidden" && matchesFilters(alert.event, target.rules.filters));
        if (inPeriod.length > 0) {
          const queued: QueuedAlert[] = inPeriod.map((alert) => ({ eventRef: alert.id, level: alert.level, title: alert.event.title, at: alert.event.at, place: alert.event.place, verification: alert.event.verification, qualifier: alert.event.qualifier ?? null, url: alert.event.url ?? null, why: alert.why }));
          const { inserted } = await enqueueEmail(target.supervisionId, "digest", slot.key, target.rules.recipient, { label: slot.label, days: slot.days, total: queued.length, alerts: queued.slice(0, 15) }, deps.now, deps.now, deps.db);
          if (inserted) report.digests += 1;
        }
      }
    } catch (error) {
      report.errors.push({ id: target.supervisionId, reason: error instanceof Error ? error.message.slice(0, 160) : "erreur" });
    }
  }
}

// --- 2. Envoi -------------------------------------------------------------------------------------------------------------

const rank = (level: QueuedAlert["level"]) => (level === "critique" ? 0 : 1);
const alertOf = (row: OutboxRow) => row.payload.alert as QueuedAlert;

export async function sendDue(deps: NotifyDeps, report: NotifyReport, options: { limit?: number; only?: readonly string[] } = {}): Promise<void> {
  const rows = await claimDue(options.limit ?? 50, deps.now, deps.db, options.only);
  if (rows.length === 0) return;
  const ids = [...new Set(rows.map((row) => row.supervisionId))];
  const [sups, rules] = await Promise.all([supervisionsById(ids, deps.db), rulesById(ids, deps.db)]);

  // Un message par digest, test ou confirmation ; toutes les alertes immédiates d'une Supervision (même adresse) dans un seul message.
  const groups = new Map<string, OutboxRow[]>();
  for (const row of rows) {
    const key = row.kind === "immediate" ? `immediate|${row.supervisionId}|${row.toEmail}` : `${row.kind}|${row.id}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  for (const group of groups.values()) {
    const first = group[0];
    const sup = sups.get(first.supervisionId);
    const prefs = rules.get(first.supervisionId);
    const settle = async (status: "sent" | "failed" | "dry_run" | "skipped", detail: { providerId?: string | null; error?: string | null; subject?: string | null; final?: boolean }) => {
      for (const row of group) await finishEmail(row.id, status, detail, deps.now, deps.db);
      if (status === "sent") report.sent += group.length;
      else if (status === "dry_run") report.dryRun += group.length;
      else if (status === "failed") report.failed += group.length;
      else report.skipped += group.length;
    };
    try {
      // Revérification au DERNIER moment : pause, lecture seule, suppression, préférences coupées ou adresse changée annulent le message.
      let skip: string | null = null;
      if (!sup || !prefs || sup.state === "deleted") skip = "Supervision introuvable.";
      else if (prefs.recipient !== first.toEmail) skip = "L'adresse a changé depuis la mise en file.";
      else if (first.kind === "immediate" || first.kind === "digest") {
        if (!canNotify(sup.state, prefs)) skip = sup.state !== "active" ? `Supervision non active (${sup.state}) : aucun e-mail.` : "Notifications désactivées ou adresse non confirmée.";
      } else if (first.kind === "test" && !prefs.recipientVerified) skip = "Adresse non confirmée.";
      else if (first.kind === "confirm" && prefs.recipientVerified) skip = "Adresse déjà confirmée.";
      if (skip || !sup) {
        await settle("skipped", { error: skip });
        continue;
      }

      const url = manageUrl(deps, first.supervisionId);
      let message: EmailMessage;
      if (first.kind === "immediate") {
        const alerts = group.map(alertOf).sort((a, b) => rank(a.level) - rank(b.level) || b.at.localeCompare(a.at));
        message = immediateEmail({ supervisionName: sup.name, supervisionUrl: url, alerts });
      } else if (first.kind === "digest") {
        const p = first.payload as { label: string; days: number; total: number; alerts: QueuedAlert[] };
        message = digestEmail({ supervisionName: sup.name, supervisionUrl: url, label: p.label, days: p.days, generatedAt: deps.now, alerts: [...p.alerts].sort((a, b) => rank(a.level) - rank(b.level) || b.at.localeCompare(a.at)), totalAlerts: p.total });
      } else if (first.kind === "confirm") {
        message = confirmationEmail({ supervisionName: sup.name, confirmUrl: String(first.payload.confirmUrl ?? ""), manageUrl: url, hours: TOKEN_TTL_HOURS });
      } else {
        message = testEmail({ supervisionName: sup.name, supervisionUrl: url, generatedAt: deps.now });
      }

      const result = await deps.provider.send({ to: first.toEmail, subject: message.subject, text: message.text, html: message.html, idempotencyKey: `ob-${first.id}` });
      if (result.ok) await settle(result.dryRun ? "dry_run" : "sent", { providerId: result.id, subject: message.subject });
      else await settle("failed", { error: result.error, subject: message.subject, final: !result.retryable });
    } catch (error) {
      report.errors.push({ id: first.supervisionId, reason: error instanceof Error ? error.message.slice(0, 160) : "erreur" });
      try {
        await settle("failed", { error: "Erreur interne à l'envoi." });
      } catch {
        /* le message sera repris au prochain passage (réservation périmée) */
      }
    }
  }
}

/** Tâche planifiée : met en file puis envoie. */
export async function notifyScheduled(deps: NotifyDeps = defaultDeps(), options: { only?: readonly string[] } = {}): Promise<NotifyReport> {
  const report = emptyReport();
  await queueAlerts(deps, report, options);
  await sendDue(deps, report, options);
  return report;
}

// --- Demandes de l'utilisateur (confirmation d'adresse, e-mail de test) -------------------------------------------------------

export type RequestOutcome = { ok: true } | { ok: false; code: "not_found" | "no_recipient" | "not_verified" | "too_soon" | "read_only"; retryAfterSeconds?: number };

/** Envoie le lien de confirmation à l'adresse des préférences (une demande toutes les 10 minutes au plus). */
export async function requestConfirmation(ownerId: string, supervisionId: string, deps: NotifyDeps): Promise<RequestOutcome> {
  const sup = await getSupervision(ownerId, supervisionId, deps.db);
  if (!sup) return { ok: false, code: "not_found" };
  if (sup.state === "read_only_grace" || sup.state === "pending_deletion") return { ok: false, code: "read_only" };
  const prefs = (await rulesById([supervisionId], deps.db)).get(supervisionId);
  if (!prefs?.recipient) return { ok: false, code: "no_recipient" };
  if (prefs.recipientVerified) return { ok: true };
  if ((await recentCount(supervisionId, ["confirm"], minutes(deps.now, -10), deps.db)) > 0) return { ok: false, code: "too_soon", retryAfterSeconds: 600 };
  const token = signConfirmToken(supervisionId, prefs.recipient, deps.secret, deps.now);
  const confirmUrl = `${deps.siteUrl}/api/supervision-notify/confirm?token=${encodeURIComponent(token)}`;
  await enqueueEmail(supervisionId, "confirm", `confirm:${prefs.recipient}:${deps.now.getTime()}`, prefs.recipient, { confirmUrl }, deps.now, deps.now, deps.db);
  await sendDue(deps, emptyReport(), { limit: 10, only: [supervisionId] });
  return { ok: true };
}

/** Envoie un e-mail de test à l'adresse confirmée (une demande toutes les 2 minutes au plus). */
export async function requestTest(ownerId: string, supervisionId: string, deps: NotifyDeps): Promise<RequestOutcome> {
  const sup = await getSupervision(ownerId, supervisionId, deps.db);
  if (!sup) return { ok: false, code: "not_found" };
  if (sup.state === "read_only_grace" || sup.state === "pending_deletion") return { ok: false, code: "read_only" };
  const prefs = (await rulesById([supervisionId], deps.db)).get(supervisionId);
  if (!prefs?.recipient) return { ok: false, code: "no_recipient" };
  if (!prefs.recipientVerified) return { ok: false, code: "not_verified" };
  if ((await recentCount(supervisionId, ["test"], minutes(deps.now, -2), deps.db)) > 0) return { ok: false, code: "too_soon", retryAfterSeconds: 120 };
  await enqueueEmail(supervisionId, "test", `test:${deps.now.getTime()}`, prefs.recipient, {}, deps.now, deps.now, deps.db);
  await sendDue(deps, emptyReport(), { limit: 10, only: [supervisionId] });
  return { ok: true };
}
