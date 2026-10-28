import { THEMES } from "../themes";
import type { Tier } from "../accounts";

// Modèle d'une veille (Supervision) : zone, critères, sources, calendrier, et règles de l'offre. Module pur, sans accès
// réseau ni base : tout ce qui vient du navigateur est validé ici avant d'être enregistré.

export type Zone =
  | { kind: "circle"; lat: number; lon: number; radiusKm: number }
  | { kind: "countries"; codes: string[] };

export interface Criteria {
  /** Clés de lib/themes.ts (conflits, terrorisme, diplomatie…). */
  themes: string[];
  entities: string[];
  keywords: string[];
  exclusions: string[];
  languages: string[];
}

export type SourceType = "gdelt" | "rss" | "telegram";

export interface SourceSpec {
  type: SourceType;
  /**
   * « gdelt » : événements GDELT déjà collectés par Équinoxe (ref vide). « rss » et « telegram » : ref vide = les flux et
   * canaux d'Équinoxe ; sinon l'adresse d'un flux ou l'identifiant d'un canal public ajouté par l'utilisateur.
   */
  ref: string;
  enabled: boolean;
}

export interface Schedule {
  /** Heure souhaitée (0-23, fuseau du compte) : indicative, le planificateur peut décaler d'une heure. */
  dailyHour: number;
  /** Jour du récapitulatif hebdomadaire (0 = dimanche … 6 = samedi). */
  weeklyDay: number;
}

export type Status = "draft" | "active" | "paused" | "archived";

export interface SupervisionInput {
  name: string;
  userRequest: string;
  zone: Zone;
  criteria: Criteria;
  sources: SourceSpec[];
  schedule: Schedule;
}

export interface Supervision extends SupervisionInput {
  id: string;
  ownerId: string;
  status: Status;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const LIMITS = {
  nameMin: 3,
  nameMax: 80,
  requestMax: 2000,
  radiusMinKm: 5,
  radiusMaxKm: 1000,
  maxCountries: 12,
  maxTerms: 30,
  termMax: 80,
  maxSources: 40,
  refMax: 300,
} as const;

export const STATUSES: readonly Status[] = ["draft", "active", "paused", "archived"];

export const DEFAULT_SCHEDULE: Schedule = { dailyHour: 8, weeklyDay: 1 };

/** Sources de départ d'une veille : événements GDELT, flux d'Équinoxe et canaux Telegram d'Équinoxe ; l'utilisateur en ajoute. */
export const DEFAULT_SOURCES: SourceSpec[] = [
  { type: "gdelt", ref: "", enabled: true },
  { type: "rss", ref: "", enabled: true },
  { type: "telegram", ref: "", enabled: true },
];

// --- Offres ---------------------------------------------------------------------------------------------------------

/** Nombre de veilles actives en même temps. Gratuit et « Plus » : aucune. */
export function activeLimit(tier: Tier): number {
  switch (tier) {
    case "owner":
      return 3;
    case "intelligence":
      return 1;
    case "pro":
      return 3;
    case "enterprise":
      return 10;
    default:
      return 0;
  }
}

/** Prix mensuel affiché (euros), base du plafond de coût IA. « Enterprise » et le fondateur : pas de prix public. */
export const TIER_PRICE_EUR: Partial<Record<Tier, number>> = { plus: 7.99, intelligence: 19.99, pro: 49.99 };

/** Part du prix mensuel que le coût IA individuel d'un compte ne doit jamais dépasser. */
export const AI_COST_SHARE = 0.1;

/** Plafond mensuel de coût IA du compte, en euros ; null = aucun plafond automatique (fondateur, contrat Enterprise). */
export function aiCapEur(tier: Tier): number | null {
  const price = TIER_PRICE_EUR[tier];
  return price === undefined ? null : Math.round(price * AI_COST_SHARE * 1000) / 1000;
}

// --- Validation -----------------------------------------------------------------------------------------------------

export type Validation<T> = { ok: true; value: T } | { ok: false; errors: string[] };

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function terms(value: unknown, errors: string[], label: string): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    errors.push(`${label} : liste attendue.`);
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    const term = text(item, LIMITS.termMax);
    const key = term.toLocaleLowerCase("fr-FR");
    if (term && !seen.has(key)) {
      seen.add(key);
      out.push(term);
    }
  }
  if (out.length > LIMITS.maxTerms) errors.push(`${label} : ${LIMITS.maxTerms} éléments au plus.`);
  return out.slice(0, LIMITS.maxTerms);
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function validateZone(raw: unknown, errors: string[]): Zone | null {
  const zone = raw as { kind?: unknown; lat?: unknown; lon?: unknown; radiusKm?: unknown; codes?: unknown } | null;
  if (zone?.kind === "circle") {
    const lat = number(zone.lat);
    const lon = number(zone.lon);
    const radiusKm = number(zone.radiusKm);
    if (lat === null || lon === null || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      errors.push("Zone : centre invalide (latitude entre -90 et 90, longitude entre -180 et 180).");
      return null;
    }
    if (radiusKm === null || radiusKm < LIMITS.radiusMinKm || radiusKm > LIMITS.radiusMaxKm) {
      errors.push(`Zone : rayon entre ${LIMITS.radiusMinKm} et ${LIMITS.radiusMaxKm} km.`);
      return null;
    }
    return { kind: "circle", lat, lon, radiusKm: Math.round(radiusKm) };
  }
  if (zone?.kind === "countries") {
    const codes = Array.isArray(zone.codes)
      ? [...new Set(zone.codes.map((code) => (typeof code === "string" ? code.trim().toUpperCase() : "")))].filter((code) => /^[A-Z]{2}$/.test(code))
      : [];
    if (codes.length === 0 || codes.length > LIMITS.maxCountries) {
      errors.push(`Zone : entre 1 et ${LIMITS.maxCountries} pays.`);
      return null;
    }
    return { kind: "countries", codes };
  }
  errors.push("Zone : choisis un cercle sur la carte ou des pays.");
  return null;
}

function validateSources(raw: unknown, errors: string[]): SourceSpec[] {
  if (raw === undefined || raw === null) return DEFAULT_SOURCES.map((source) => ({ ...source }));
  if (!Array.isArray(raw)) {
    errors.push("Sources : liste attendue.");
    return [];
  }
  const out: SourceSpec[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const source = item as { type?: unknown; ref?: unknown; enabled?: unknown } | null;
    if (source?.type !== "gdelt" && source?.type !== "rss" && source?.type !== "telegram") {
      errors.push("Sources : type inconnu.");
      continue;
    }
    const ref = text(source.ref, LIMITS.refMax);
    if (source.type === "rss" && ref !== "" && !/^https?:\/\//i.test(ref)) {
      errors.push("Sources : un flux RSS doit être une adresse http(s).");
      continue;
    }
    if (source.type === "telegram" && ref !== "" && !/^[A-Za-z0-9_]{4,64}$/.test(ref)) {
      errors.push("Sources : un canal Telegram s'écrit sans « @ » ni adresse (lettres, chiffres, souligné).");
      continue;
    }
    const key = `${source.type}:${ref.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type: source.type, ref: source.type === "gdelt" ? "" : ref, enabled: source.enabled !== false });
  }
  if (out.length > LIMITS.maxSources) errors.push(`Sources : ${LIMITS.maxSources} au plus.`);
  return out.slice(0, LIMITS.maxSources);
}

function validateSchedule(raw: unknown): Schedule {
  const schedule = raw as { dailyHour?: unknown; weeklyDay?: unknown } | null;
  const hour = number(schedule?.dailyHour);
  const day = number(schedule?.weeklyDay);
  return {
    dailyHour: hour !== null && Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : DEFAULT_SCHEDULE.dailyHour,
    weeklyDay: day !== null && Number.isInteger(day) && day >= 0 && day <= 6 ? day : DEFAULT_SCHEDULE.weeklyDay,
  };
}

/** Une veille a besoin d'au moins un critère de recherche : thème, entité ou mot-clé. */
export function hasSearchCriteria(criteria: Criteria): boolean {
  return criteria.themes.length + criteria.entities.length + criteria.keywords.length > 0;
}

export function validateSupervisionInput(raw: unknown): Validation<SupervisionInput> {
  const input = raw as Record<string, unknown> | null;
  if (!input || typeof input !== "object") return { ok: false, errors: ["Demande invalide."] };
  const errors: string[] = [];

  const name = text(input.name, LIMITS.nameMax);
  if (name.length < LIMITS.nameMin) errors.push(`Nom : ${LIMITS.nameMin} caractères au moins.`);
  const userRequest = text(input.userRequest, LIMITS.requestMax);

  const zone = validateZone(input.zone, errors);

  const rawCriteria = (input.criteria ?? {}) as Record<string, unknown>;
  const themeKeys = new Set(THEMES.map((theme) => theme.key as string));
  const themes = terms(rawCriteria.themes, errors, "Thèmes");
  const unknownTheme = themes.find((theme) => !themeKeys.has(theme));
  if (unknownTheme) errors.push(`Thèmes : « ${unknownTheme} » n'existe pas.`);
  const criteria: Criteria = {
    themes: themes.filter((theme) => themeKeys.has(theme)),
    entities: terms(rawCriteria.entities, errors, "Entités"),
    keywords: terms(rawCriteria.keywords, errors, "Mots-clés"),
    exclusions: terms(rawCriteria.exclusions, errors, "Exclusions"),
    languages: terms(rawCriteria.languages, errors, "Langues"),
  };
  if (!hasSearchCriteria(criteria)) errors.push("Critères : au moins un thème, une entité ou un mot-clé.");

  const sources = validateSources(input.sources, errors);
  if (sources.length === 0 && errors.length === 0) errors.push("Sources : au moins une source.");

  if (errors.length > 0 || !zone) return { ok: false, errors };
  return { ok: true, value: { name, userRequest, zone, criteria, sources, schedule: validateSchedule(input.schedule) } };
}
