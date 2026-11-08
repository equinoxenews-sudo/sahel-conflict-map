import { findIso3ByLabel } from "../countries";
import type { CountryRisk, RiskTier } from "../countryRisk";

// Niveau de risque des pays d'après les événements des analystes (calcul pur, testable).

export interface AnalystEvent {
  id: number;
  zone: string;
  title: string;
  publishedAt: string;
  lat: number;
  lon: number;
  place: string | null;
  country: string | null;
  /** Code ISO 3 du pays (calculé à la lecture) : permet de compter les articles d'un pays sans fiches pays côté navigateur. */
  iso3?: string | null;
  confidence: number | null;
  confidenceLabel: string | null;
  claimedBy: string | null;
  importance: "high" | "medium" | "low";
  theme: string | null;
  eventType: string | null;
  /** « ville » (localité citée) ou « capitale » (information d'ordre national). */
  precision: string | null;
  /** Vignette de l'article. */
  imageUrl?: string | null;
}

// --- Niveau de risque par pays ----------------------------------------------------------

const IMPORTANCE_WEIGHT = { high: 3, medium: 1.5, low: 0.5 } as const;
/** Demi-vie du poids d'un événement : un fait d'il y a 10 jours compte moitié moins. */
const HALF_LIFE_DAYS = 10;
/** Thèmes de violence réelle : seuls (avec les types d'événement violents) à compter en plein dans la couleur d'un pays. */
const VIOLENT_THEMES = new Set(["conflicts", "terrorism", "civil_unrest"]);
/** Types d'événement violents, quel que soit le thème de l'article (une frappe classée « défense » reste une frappe). */
const VIOLENT_EVENT_TYPES = new Set([
  "airstrike",
  "drone_strike",
  "explosion",
  "armed_clash",
  "artillery_fire",
  "missile_attack",
  "terrorist_attack",
  "ied_attack",
  "kidnapping",
  "assassination",
  "riot",
]);
/** Part du poids gardée par un événement sans violence (doctrine, exercice, livraison d'armes, diplomatie, économie…). */
const NON_VIOLENT_SHARE = 0.25;

/** Vrai si l'événement relève de la violence réelle. Sans thème ni type (articles antérieurs aux analystes V2) : on ne peut pas juger, il compte en plein. */
export function isViolentEvent(e: Pick<AnalystEvent, "theme" | "eventType">): boolean {
  if (!e.theme && !e.eventType) return true;
  return (e.theme !== null && VIOLENT_THEMES.has(e.theme)) || (e.eventType !== null && VIOLENT_EVENT_TYPES.has(e.eventType));
}

/** Poids d'un événement : gravité × crédibilité × fraîcheur × violence (plein) ou non (un quart). */
export function eventWeight(e: AnalystEvent, now: number): number {
  const ageDays = Math.max(0, (now - Date.parse(e.publishedAt)) / 86_400_000);
  const recency = Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
  // Sans indice (articles antérieurs aux analystes V2) : crédibilité moyenne.
  const credibility = Math.min(1, Math.max(0.15, (e.confidence ?? 55) / 100));
  const nature = isViolentEvent(e) ? 1 : NON_VIOLENT_SHARE;
  return IMPORTANCE_WEIGHT[e.importance] * credibility * recency * nature;
}

/** Seuils de score (somme des poids sur 30 jours) : réglés pour que quelques faits graves
 *  et crédibles suffisent au rouge, et qu'un fait isolé reste en jaune. */
export const RISK_THRESHOLDS = { critical: 6, danger: 2.5, watch: 0.6 } as const;

export function tierForScore(score: number): RiskTier | null {
  if (score >= RISK_THRESHOLDS.critical) return "critical";
  if (score >= RISK_THRESHOLDS.danger) return "danger";
  if (score >= RISK_THRESHOLDS.watch) return "watch";
  return null;
}

/** Couleur de chaque pays (clé ISO 3) d'après les événements des analystes. */
export function countryRiskFromAnalystEvents(events: AnalystEvent[], now = Date.now()): Record<string, CountryRisk> {
  const byIso = new Map<string, { score: number; count: number; name: string }>();
  for (const e of events) {
    // Couleurs des pays : 30 derniers jours seulement.
    if (!e.country || now - Date.parse(e.publishedAt) > 30 * 86_400_000) continue;
    const iso = findIso3ByLabel(e.country);
    if (!iso) continue;
    const cur = byIso.get(iso.iso3) ?? { score: 0, count: 0, name: iso.name };
    cur.score += eventWeight(e, now);
    cur.count += 1;
    byIso.set(iso.iso3, cur);
  }
  const result: Record<string, CountryRisk> = {};
  for (const [iso3, { score, count }] of byIso) {
    const tier = tierForScore(score);
    if (!tier) continue;
    result[iso3] = {
      tier,
      label: `${count} événement${count > 1 ? "s" : ""} analysé${count > 1 ? "s" : ""} — 30 derniers jours`,
    };
  }
  return result;
}
