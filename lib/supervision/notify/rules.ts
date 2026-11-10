// Supervision V1, Lot 9 : règles des notifications par e-mail. Module PUR et testé : aucune base, aucun réseau, aucune IA.
//
// Décisions du cahier des charges (section 6.2) :
//  - e-mail immédiat configurable selon les niveaux, digest à fréquence choisie ;
//  - déduplication, regroupement des mises à jour d'un même incident, temporisation ;
//  - une Supervision en pause, en lecture seule ou en brouillon n'envoie rien ;
//  - pas de SMS ni de notification push.
// Ce qui est envoyé reprend les alertes du tableau (alerts/rules.ts) : critique et importante seulement, jamais « information ».

import { ALERT_LEVELS, type Alert, type AlertLevel, type StoredDecision, effectiveStatus } from "../alerts/rules";

export const DIGEST_MODES = ["off", "daily", "weekly"] as const;
export type DigestMode = (typeof DIGEST_MODES)[number];

/** Délai de temporisation d'un e-mail immédiat : les alertes qui arrivent dans la même fenêtre partent ensemble dans un seul message. */
export const IMMEDIATE_DELAY_MINUTES = 10;
/** Plafond d'alertes mises en file à chaque passage : une rafale d'événements ne déclenche pas une avalanche de messages. */
export const ENQUEUE_PER_RUN_MAX = 25;
/** Alertes listées dans un seul message ; le reste est annoncé par un nombre. */
export const ALERTS_PER_EMAIL_MAX = 15;
/** Heure (Paris) à partir de laquelle le digest du jour est dû. */
export const DIGEST_HOUR_PARIS = 7;
export const RECIPIENT_MAX = 254;

export interface NotificationRules {
  enabled: boolean;
  immediateLevels: AlertLevel[];
  digest: DigestMode;
  recipient: string | null;
  recipientVerified: boolean;
  enabledAt: string | null;
}

export type RulesInput = { ok: true; value: { enabled: boolean; immediateLevels: AlertLevel[]; digest: DigestMode; recipient: string | null } } | { ok: false; errors: string[] };

/** Adresse e-mail simple et prudente : une seule adresse, pas d'espace, pas de nom affiché, pas de caractère de contrôle. */
export const EMAIL_PATTERN = /^[^@\s<>(),;:"\\]+@[^@\s<>(),;:"\\]+\.[^@\s<>(),;:"\\]+$/;

export function isEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= RECIPIENT_MAX && EMAIL_PATTERN.test(value);
}

export function validateRules(payload: unknown): RulesInput {
  const record = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const errors: string[] = [];
  if (typeof record.enabled !== "boolean") errors.push("L'activation des notifications est invalide.");
  const rawLevels = Array.isArray(record.immediateLevels) ? record.immediateLevels : record.immediateLevels === undefined ? [] : null;
  const levels: AlertLevel[] = [];
  if (rawLevels === null) errors.push("Les niveaux d'e-mail immédiat sont invalides.");
  else {
    for (const level of rawLevels) {
      if (!(ALERT_LEVELS as readonly unknown[]).includes(level)) {
        errors.push("Un niveau d'e-mail immédiat est inconnu : seuls « critique » et « importante » existent.");
        break;
      }
      if (!levels.includes(level as AlertLevel)) levels.push(level as AlertLevel);
    }
  }
  const digest = record.digest === undefined ? "off" : record.digest;
  if (!(DIGEST_MODES as readonly unknown[]).includes(digest)) errors.push("La fréquence du digest est invalide : aucune, quotidienne ou hebdomadaire.");
  let recipient: string | null = null;
  if (record.recipient !== undefined && record.recipient !== null && record.recipient !== "") {
    const trimmed = typeof record.recipient === "string" ? record.recipient.trim().toLowerCase() : "";
    if (isEmail(trimmed)) recipient = trimmed;
    else errors.push("L'adresse e-mail n'est pas valide.");
  }
  if (record.enabled === true && recipient === null) errors.push("Renseigne une adresse e-mail pour activer les notifications.");
  if (record.enabled === true && levels.length === 0 && digest === "off") errors.push("Choisis au moins un niveau d'e-mail immédiat ou un digest.");
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: { enabled: record.enabled === true, immediateLevels: ALERT_LEVELS.filter((level) => levels.includes(level)), digest: digest as DigestMode, recipient } };
}

// --- Qui reçoit quoi ----------------------------------------------------------------------------------------------------

/** Les notifications ne partent que d'une Supervision ACTIVE, avec des préférences activées et une adresse confirmée. */
export function canNotify(state: string, rules: Pick<NotificationRules, "enabled" | "recipient" | "recipientVerified">): boolean {
  return state === "active" && rules.enabled && rules.recipient !== null && rules.recipientVerified;
}

export interface QueuedAlert {
  eventRef: string;
  level: AlertLevel;
  title: string;
  at: string;
  place: string;
  verification: string;
  qualifier: string | null;
  url: string | null;
  why: string;
}

export const alertKey = (id: string, level: AlertLevel) => `alert:${id}:${level}`;

/**
 * Alertes à mettre en file à ce passage. Une alerte est retenue si :
 *  - son niveau fait partie des niveaux d'e-mail immédiat ;
 *  - son événement date d'APRÈS l'activation des notifications (pas d'avalanche d'historique) ;
 *  - l'utilisateur n'a pas déjà tranché (lue, conservée ou masquée) pour CE niveau ;
 *  - elle n'est pas déjà en file ou envoyée (la base refuse le doublon : clé alertKey).
 * Un changement de niveau (importante → critique) donne une autre clé, donc un nouveau message.
 */
export function selectAlertsToQueue(alerts: readonly Alert[], rules: NotificationRules, decisions: ReadonlyMap<string, StoredDecision>, already: ReadonlySet<string>): QueuedAlert[] {
  if (!rules.enabled || rules.immediateLevels.length === 0) return [];
  const since = rules.enabledAt ? Date.parse(rules.enabledAt) : Infinity;
  const out: QueuedAlert[] = [];
  for (const alert of alerts) {
    if (out.length >= ENQUEUE_PER_RUN_MAX) break;
    if (!rules.immediateLevels.includes(alert.level)) continue;
    if (!(Date.parse(alert.event.at) >= since)) continue;
    if (effectiveStatus(alert, decisions.get(alert.id)) !== "new") continue;
    if (already.has(alertKey(alert.id, alert.level))) continue;
    out.push({
      eventRef: alert.id,
      level: alert.level,
      title: alert.event.title,
      at: alert.event.at,
      place: alert.event.place,
      verification: alert.event.verification,
      qualifier: alert.event.qualifier ?? null,
      url: alert.event.url ?? null,
      why: alert.why,
    });
  }
  return out;
}

// --- Digest -------------------------------------------------------------------------------------------------------------

const PARIS = "Europe/Paris";

function parisParts(date: Date): { year: number; month: number; day: number; hour: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: PARIS, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short" }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { year: Number(get("year")), month: Number(get("month")), day: Number(get("day")), hour: Number(get("hour")), weekday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday")) + 1 };
}

/** Numéro de semaine ISO d'une date civile. */
function isoWeek(year: number, month: number, day: number): { year: number; week: number } {
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayNumber = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNumber);
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return { year: date.getUTCFullYear(), week: Math.ceil(((date.getTime() - start.getTime()) / 86_400_000 + 1) / 7) };
}

export interface DigestSlot {
  /** Clé de déduplication : un seul digest par jour (quotidien) ou par semaine (hebdomadaire). */
  key: string;
  /** Période couverte, en jours. */
  days: number;
  label: string;
}

/**
 * Le digest dû à cet instant, ou null. Quotidien : dû chaque jour à partir de 7 h (Paris). Hebdomadaire : dû le lundi à partir de 7 h
 * (Paris) ; si le lundi est manqué, il part dès que possible dans la semaine, une seule fois (même clé pour toute la semaine).
 */
export function digestDue(mode: DigestMode, now: Date): DigestSlot | null {
  if (mode === "off") return null;
  const p = parisParts(now);
  if (mode === "daily") {
    if (p.hour < DIGEST_HOUR_PARIS) return null;
    const day = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
    return { key: `digest:daily:${day}`, days: 1, label: "quotidien" };
  }
  if (p.weekday === 1 && p.hour < DIGEST_HOUR_PARIS) return null;
  const week = isoWeek(p.year, p.month, p.day);
  return { key: `digest:weekly:${week.year}-W${String(week.week).padStart(2, "0")}`, days: 7, label: "hebdomadaire" };
}

export function notifyMessage(code: string | undefined, detail: Record<string, unknown> = {}): string {
  switch (code) {
    case "read_only":
      return "Cette Supervision est en lecture seule : les notifications ne sont plus modifiables.";
    case "not_found":
      return "Cette Supervision est introuvable.";
    case "invalid_input":
      return "La demande n'est pas valide.";
    case "no_recipient":
      return "Renseigne d'abord une adresse e-mail.";
    case "not_verified":
      return "Confirme d'abord ton adresse avec le lien reçu par e-mail.";
    case "too_soon":
      return `Un e-mail de ce type vient d'être demandé : réessaie dans ${typeof detail.retry_after_seconds === "number" ? Math.ceil(detail.retry_after_seconds / 60) : 5} minute(s).`;
    case "locked":
      return "Connexion requise.";
    case "forbidden":
      return "Cette rubrique n'est pas ouverte à ton offre.";
    default:
      return "L'opération a échoué. Réessaie dans un instant.";
  }
}
