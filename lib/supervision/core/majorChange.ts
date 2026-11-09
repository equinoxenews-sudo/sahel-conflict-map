import type { MajorChangeRules } from "./policy";

// Supervision V1, Lot 1 : une modification de périmètre est-elle « majeure » (donc soumise au crédit de création / refonte) ?
// Règle validée le 09/11/2026. Majeure si AU MOINS UNE des conditions suivantes :
//   1. géographie : la zone principale est remplacée (Mali → Taïwan) ;
//   2. objectif : le sujet de veille change fondamentalement (sécuritaire → économique) ;
//   3. volume : hausse estimée de plus de 30 % du volume de collecte ;
//   4. coût IA : hausse estimée de plus de 30 % du coût mensuel de traitement IA.
// Ajouter un pays, une source ou un mot-clé n'est PAS automatiquement majeur : c'est leur impact qui compte. Les hausses
// successives sont comparées CUMULATIVEMENT au périmètre de référence (dernière création ou refonte majeure), jamais à la
// version précédente. Une estimation insuffisamment fiable est signalée, et un élargissement qu'on ne sait pas chiffrer est traité
// comme majeur (sinon un gros élargissement contournerait le quota). Module pur, testé.

export type ScopeZone = { kind: "countries"; codes: string[] } | { kind: "circle"; lat: number; lon: number; radiusKm: number };

export interface ScopeDefinition {
  primaryZone: ScopeZone;
  /** Clé de l'objectif de veille (taxonomie fermée choisie par l'interface : « securite », « economie », « diplomatie »…). */
  objective: string;
  countries: string[];
  sources: string[];
  keywords: string[];
  entities: string[];
}

export type Confidence = "measured" | "estimated" | "unknown";

export interface ScopeEstimate {
  /** Publications attendues par mois. */
  volumePerMonth: number | null;
  volumeConfidence: Confidence;
  /** Coût mensuel de traitement IA attendu, en dollars. */
  aiCostUsdPerMonth: number | null;
  costConfidence: Confidence;
}

export interface ScopeSnapshot {
  scope: ScopeDefinition;
  estimate: ScopeEstimate;
}

export type MajorReason = "zone_replaced" | "objective_changed" | "volume_increase" | "cost_increase" | "unreliable_expansion";
export type EstimateWarning = "volume_estimate_unreliable" | "cost_estimate_unreliable";

export interface Classification {
  major: boolean;
  reasons: MajorReason[];
  /** À montrer à l'utilisateur AVANT l'activation (cahier des charges : estimations insuffisamment fiables). */
  warnings: EstimateWarning[];
  /** Hausses mesurées par rapport au périmètre de référence (null : non calculables). */
  volumeIncrease: number | null;
  costIncrease: number | null;
}

const EARTH_RADIUS_KM = 6371;
/** Tolérance d'arrondi : (1,3 − 1) / 1 vaut 0,30000000000000004 en virgule flottante, et « exactement 30 % » n'est pas « plus de 30 % ». */
const EPSILON = 1e-9;

function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

const norm = (value: string) => value.trim().toLocaleLowerCase("fr-FR");

/**
 * La zone principale est-elle REMPLACÉE ? Pays : plus aucun pays en commun. Cercles : les deux cercles ne se touchent plus.
 * Un élargissement (Mali → Mali + Niger, cercle plus grand) n'est pas un remplacement : son effet passe par le volume et le coût.
 * Un pays remplacé par un cercle (ou l'inverse) est traité comme un remplacement : sans géométrie de pays ici, on ne peut pas
 * prouver qu'ils se recouvrent, et le doute ne doit pas profiter à un contournement du quota.
 */
export function zoneReplaced(reference: ScopeZone, next: ScopeZone): boolean {
  if (reference.kind === "countries" && next.kind === "countries") {
    const before = new Set(reference.codes.map(norm));
    return !next.codes.some((code) => before.has(norm(code)));
  }
  if (reference.kind === "circle" && next.kind === "circle") {
    return distanceKm(reference, next) > reference.radiusKm + next.radiusKm;
  }
  return true;
}

function zoneEnlarged(reference: ScopeZone, next: ScopeZone): boolean {
  if (reference.kind === "countries" && next.kind === "countries") {
    const before = new Set(reference.codes.map(norm));
    return next.codes.some((code) => !before.has(norm(code)));
  }
  if (reference.kind === "circle" && next.kind === "circle") return next.radiusKm > reference.radiusKm;
  return false;
}

function addedItems(before: string[], after: string[]): boolean {
  const known = new Set(before.map(norm));
  return after.some((item) => !known.has(norm(item)));
}

/** Le nouveau périmètre ajoute-t-il quelque chose (pays, sources, mots-clés, entités, zone plus large) ? */
export function isExpansion(reference: ScopeDefinition, next: ScopeDefinition): boolean {
  return (
    zoneEnlarged(reference.primaryZone, next.primaryZone) ||
    addedItems(reference.countries, next.countries) ||
    addedItems(reference.sources, next.sources) ||
    addedItems(reference.keywords, next.keywords) ||
    addedItems(reference.entities, next.entities)
  );
}

function increase(reference: number | null, next: number | null, referenceConfidence: Confidence, nextConfidence: Confidence): number | null {
  if (reference === null || next === null || reference <= 0) return null;
  if (referenceConfidence === "unknown" || nextConfidence === "unknown") return null;
  return (next - reference) / reference;
}

/**
 * Classe le passage du périmètre de RÉFÉRENCE (dernière création ou refonte majeure) au périmètre proposé.
 * Condition « plus de » : une hausse d'exactement 30 % n'est pas majeure.
 */
export function classifyScopeChange(reference: ScopeSnapshot, next: ScopeSnapshot, rules: MajorChangeRules): Classification {
  const reasons: MajorReason[] = [];
  const warnings: EstimateWarning[] = [];

  if (zoneReplaced(reference.scope.primaryZone, next.scope.primaryZone)) reasons.push("zone_replaced");
  if (norm(reference.scope.objective) !== norm(next.scope.objective)) reasons.push("objective_changed");

  const volumeIncrease = increase(reference.estimate.volumePerMonth, next.estimate.volumePerMonth, reference.estimate.volumeConfidence, next.estimate.volumeConfidence);
  const costIncrease = increase(reference.estimate.aiCostUsdPerMonth, next.estimate.aiCostUsdPerMonth, reference.estimate.costConfidence, next.estimate.costConfidence);
  const expansion = isExpansion(reference.scope, next.scope);

  if (volumeIncrease === null) {
    if (expansion) warnings.push("volume_estimate_unreliable");
  } else if (volumeIncrease > rules.volumeIncreaseThreshold + EPSILON) {
    reasons.push("volume_increase");
  }
  if (costIncrease === null) {
    if (expansion) warnings.push("cost_estimate_unreliable");
  } else if (costIncrease > rules.costIncreaseThreshold + EPSILON) {
    reasons.push("cost_increase");
  }

  // Élargissement dont l'impact ne peut pas être chiffré de façon fiable (au moins un des deux critères inconnu) : traité comme
  // majeur, car on ne peut pas garantir que le seuil n'est pas franchi. Si un autre critère a déjà prouvé le dépassement, sa raison
  // précise suffit et on n'ajoute pas celle-ci.
  if (rules.unreliableExpansionIsMajor && warnings.length > 0 && !reasons.includes("volume_increase") && !reasons.includes("cost_increase")) {
    reasons.push("unreliable_expansion");
  }

  return { major: reasons.length > 0, reasons, warnings, volumeIncrease, costIncrease };
}
