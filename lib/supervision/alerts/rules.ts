// Supervision V1, Lot 8 : alertes dans le tableau de bord. Module PUR et testé : aucune base, aucun réseau, aucune IA.
//
// Décisions du 10/11/2026 (D4) :
//  - une alerte naît d'un événement de priorité « critique » ou « importante » ; « information » ne déclenche jamais d'alerte ;
//  - la priorité et le statut de vérification restent indépendants (une alerte critique peut n'être qu'un signalement) ;
//  - les publications de presse collectées sont toutes « information » tant que l'IA ne les trie pas : elles ne déclenchent rien ;
//  - une alerte ne monte pas de niveau toute seule à partir du nombre de reprises (attendre le regroupement des doublons).
// Une alerte n'est PAS stockée : elle se déduit des événements. Seule la décision de l'utilisateur (lue, conservée, masquée) est
// enregistrée, avec le niveau qu'avait l'alerte à ce moment-là.

import type { BoardEvent, Priority } from "../dashboard/fixtures";

export type AlertLevel = Exclude<Priority, "information">;
export const ALERT_LEVELS: readonly AlertLevel[] = ["critique", "importante"];
export const LEVEL_LABELS: Record<AlertLevel, string> = { critique: "Critique", importante: "Importante" };

/** Décision enregistrée sur une alerte. L'absence de décision = « à traiter ». */
export type AlertStatus = "new" | "read" | "kept" | "hidden";
export const DECISIONS = ["read", "kept", "hidden"] as const;
export type Decision = (typeof DECISIONS)[number];

export interface Alert {
  /** Identifiant de l'événement (a-…, e-…, p-…). */
  id: string;
  level: AlertLevel;
  event: BoardEvent;
  /** Origine du classement, en clair. */
  why: string;
}

export interface AlertContext {
  /** État de la Supervision : seule une Supervision active ou en brouillon (aperçu) produit des alertes ; en pause elles sont figées. */
  state: string;
  pausedAt?: string | null;
}

export interface StoredDecision {
  status: Decision;
  /** Niveau de l'alerte au moment de la décision. */
  level: AlertLevel;
}

export function isAlertLevel(priority: Priority): priority is AlertLevel {
  return priority === "critique" || priority === "importante";
}

/** Pourquoi cet événement est classé à ce niveau, d'après la règle réellement appliquée (jamais un score opaque). */
export function alertReason(event: BoardEvent, level: AlertLevel): string {
  if (event.kind === "article") {
    return level === "critique"
      ? "Article analysé d'importance haute, sur un événement violent (affrontement, frappe ou attentat)."
      : "Article analysé d'importance haute.";
  }
  if (event.kind === "signal") {
    const base = `Signalement médiatique de violences repris par ${event.publications} mention${event.publications > 1 ? "s" : ""} (importante à partir de 6, critique à partir de 20).`;
    return `${base} Le nombre de reprises mesure l'attention des médias, pas la véracité.`;
  }
  return "Classement fixé par la priorité de l'événement.";
}

const byRecency = (a: Alert, b: Alert) => b.event.at.localeCompare(a.event.at);

/**
 * Alertes d'une liste d'événements : critiques d'abord, puis importantes, les plus récentes en tête.
 *  - Brouillon : aperçu (aucune notification n'est envoyée de toute façon à ce stade).
 *  - Active : alertes en direct.
 *  - En pause : plus de NOUVELLE alerte, seuls les événements antérieurs à la pause restent.
 *  - Initialisation : rien.
 *  - Lecture seule ou suppression en cours : consultation des alertes existantes, sans coupure (les données ne bougent plus).
 */
export function buildAlerts(events: readonly BoardEvent[], context: AlertContext): Alert[] {
  if (context.state === "initializing" || context.state === "deleted") return [];
  const cutoff = context.state === "paused" && context.pausedAt ? Date.parse(context.pausedAt) : null;
  const alerts: Alert[] = [];
  for (const event of events) {
    if (!isAlertLevel(event.priority)) continue;
    if (cutoff !== null && Number.isFinite(cutoff) && Date.parse(event.at) > cutoff) continue;
    alerts.push({ id: event.id, level: event.priority, event, why: alertReason(event, event.priority) });
  }
  const rank = (level: AlertLevel) => ALERT_LEVELS.indexOf(level);
  return alerts.sort((a, b) => rank(a.level) - rank(b.level) || byRecency(a, b));
}

/**
 * Statut d'une alerte. Si elle a changé de niveau depuis la décision de l'utilisateur et qu'elle est MONTÉE (importante → critique),
 * elle redevient « à traiter » : une décision prise sur un niveau plus bas ne vaut pas pour un niveau plus haut.
 */
export function effectiveStatus(alert: Pick<Alert, "level">, stored: StoredDecision | undefined): AlertStatus {
  if (!stored) return "new";
  if (ALERT_LEVELS.indexOf(alert.level) < ALERT_LEVELS.indexOf(stored.level)) return "new";
  return stored.status;
}

export interface AlertCounts {
  new: number;
  newCritical: number;
  newImportant: number;
  read: number;
  kept: number;
  hidden: number;
}

export function countAlerts(alerts: readonly Alert[], decisions: ReadonlyMap<string, StoredDecision>): AlertCounts {
  const counts: AlertCounts = { new: 0, newCritical: 0, newImportant: 0, read: 0, kept: 0, hidden: 0 };
  for (const alert of alerts) {
    const status = effectiveStatus(alert, decisions.get(alert.id));
    counts[status] += 1;
    if (status === "new") {
      if (alert.level === "critique") counts.newCritical += 1;
      else counts.newImportant += 1;
    }
  }
  return counts;
}

// --- Saisie d'une décision ----------------------------------------------------------------------------------------------

export const EVENT_REF = /^[a-z]-[A-Za-z0-9-]{1,80}$/;
export const DECISION_BATCH_MAX = 100;

export interface DecisionItem {
  eventRef: string;
  level: AlertLevel;
}

export type DecisionInput = { ok: true; value: { status: Decision | "new"; items: DecisionItem[] } } | { ok: false; errors: string[] };

/** { status: 'read'|'kept'|'hidden'|'new', items: [{ eventRef, level }] } — 'new' rétablit l'alerte « à traiter ». */
export function validateDecision(payload: unknown): DecisionInput {
  const record = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const errors: string[] = [];
  const status = record.status;
  if (status !== "new" && !(DECISIONS as readonly unknown[]).includes(status)) errors.push("Le statut de l'alerte est invalide.");
  const raw = Array.isArray(record.items) ? record.items : [];
  if (raw.length === 0) errors.push("Aucune alerte désignée.");
  if (raw.length > DECISION_BATCH_MAX) errors.push(`Trop d'alertes à la fois (${DECISION_BATCH_MAX} au maximum).`);
  const items: DecisionItem[] = [];
  const seen = new Set<string>();
  for (const entry of raw.slice(0, DECISION_BATCH_MAX)) {
    const item = typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>) : {};
    if (typeof item.eventRef !== "string" || !EVENT_REF.test(item.eventRef) || (item.level !== "critique" && item.level !== "importante")) {
      errors.push("Une alerte désignée est invalide.");
      break;
    }
    if (!seen.has(item.eventRef)) {
      seen.add(item.eventRef);
      items.push({ eventRef: item.eventRef, level: item.level });
    }
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: { status: status as Decision | "new", items } };
}

export function alertMessage(code: string | undefined, detail: Record<string, unknown> = {}): string {
  switch (code) {
    case "read_only":
      return "Cette Supervision est en lecture seule : les alertes ne sont plus modifiables.";
    case "limit_reached":
      return `Trop de décisions enregistrées sur cette Supervision (${typeof detail.limit === "number" ? detail.limit : 2000} au maximum) : rétablis-en quelques-unes.`;
    case "not_found":
      return "Cette Supervision est introuvable.";
    case "invalid_input":
      return "La demande n'est pas valide.";
    case "locked":
      return "Connexion requise.";
    case "forbidden":
      return "Cette rubrique n'est pas ouverte à ton offre.";
    default:
      return "L'opération a échoué. Réessaie dans un instant.";
  }
}
