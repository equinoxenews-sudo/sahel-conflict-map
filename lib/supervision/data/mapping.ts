// Supervision V1, Lot 3 : transformation des lignes publiques du site (zone_briefs = articles analysés, conflict_events = signalements
// médiatiques GDELT) en « événements de tableau de bord ». Module PUR : aucun réseau, aucune base, testé.
//
// Règles de prudence (cahier des charges, sections 4 et 7) :
//  - un statut de vérification n'est JAMAIS inventé : les articles reprennent leur propre qualificatif, les signalements médiatiques
//    restent « signalement » quel que soit leur nombre de mentions (le nombre de publications n'est pas un indice de véracité) ;
//  - la priorité vient de l'importance de l'article et de la nature de l'événement, pas d'un score opaque ;
//  - ce qui n'est pas connu reste vide (pas de lieu inventé, pas de titre inventé : le titre d'un signalement dit ce qu'il est).
// Les correspondances ci-dessous sont PROVISOIRES (décision D4, statuts de vérification, pas encore tranchée).

import { COUNTRY_CODES } from "../../countryCodes";
import { COUNTRY_TO_ISO3 } from "../../countryToIso3";
import type { BoardEvent, Priority, Verification } from "../dashboard/fixtures";
import type { Theme } from "../dashboard/state";

export type BoardTheme = Exclude<Theme, "all">;

export interface BriefRow {
  id: number;
  zone_slug: string;
  title: string;
  summary: string | null;
  source_urls: string[] | null;
  source_domains: string[] | null;
  published_at: string;
  countries: string[] | null;
  primary_theme: string | null;
  event_type: string | null;
  importance: string | null;
  veracity: string | null;
  source_count: number | null;
  place_name: string | null;
  place_country: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** Publication de presse collectée pour UNE Supervision (sv_matches + sv_items). */
export interface MatchRow {
  theme: string;
  reason: string;
  terms: string[];
  sv_items: { id: string; url: string; title: string; excerpt: string | null; source_name: string | null; published_at: string | null } | null;
}

export interface EventRow {
  id: number;
  event_date: string;
  country: string;
  latitude: number;
  longitude: number;
  category: string;
  source: string | null;
  num_mentions: number | null;
  summary: string | null;
}

// --- Thèmes -----------------------------------------------------------------------------------------------------------------

const THEME_BY_PRIMARY: Record<string, BoardTheme> = {
  conflicts: "conflits",
  terrorism: "securite",
  defense_security: "securite",
  intelligence_influence: "securite",
  civil_unrest: "securite",
  crime_trafficking: "securite",
  humanitarian_health: "humanitaire",
  climate_disasters: "humanitaire",
  politics: "politique",
  diplomacy: "politique",
  economy: "politique",
  energy_resources: "politique",
  strategic_development: "politique",
};

const THEME_BY_EVENT_TYPE: Record<string, BoardTheme> = {
  armed_clash: "conflits",
  airstrike: "conflits",
  drone_strike: "conflits",
  terrorist_attack: "securite",
  criminal_operation: "securite",
  protest: "securite",
  humanitarian_crisis: "humanitaire",
  natural_disaster: "humanitaire",
};

const VIOLENT_EVENT_TYPES = new Set(["armed_clash", "airstrike", "drone_strike", "terrorist_attack"]);

export function themeOfBrief(primaryTheme: string | null, eventType: string | null): BoardTheme {
  if (primaryTheme && THEME_BY_PRIMARY[primaryTheme]) return THEME_BY_PRIMARY[primaryTheme];
  if (eventType && THEME_BY_EVENT_TYPE[eventType]) return THEME_BY_EVENT_TYPE[eventType];
  return "politique";
}

const EVENT_CATEGORIES: Record<string, { label: string; theme: BoardTheme; violent: boolean }> = {
  Battles: { label: "Affrontements", theme: "conflits", violent: true },
  "Explosions/Remote violence": { label: "Explosions ou violences à distance", theme: "conflits", violent: true },
  "Violence against civilians": { label: "Violences contre des civils", theme: "securite", violent: true },
  Protests: { label: "Manifestations", theme: "securite", violent: false },
  "Strategic developments": { label: "Évolution stratégique", theme: "politique", violent: false },
};

// --- Priorité et vérification -----------------------------------------------------------------------------------------------

export function priorityOfBrief(importance: string | null, eventType: string | null): Priority {
  if (importance !== "high") return "information";
  return eventType && VIOLENT_EVENT_TYPES.has(eventType) ? "critique" : "importante";
}

export function verificationOfBrief(veracity: string | null): Verification {
  switch (veracity) {
    case "Confirmé":
      return "confirme";
    case "Très probable":
      return "corrobore";
    case "Peu probable":
      return "conteste";
    default:
      return "signalement"; // revendiqué, possible, non confirmé ou inconnu
  }
}

/** Un signalement médiatique est violent ET très repris : critique à partir de 20 mentions, importante à partir de 6. */
export function priorityOfEvent(category: string, mentions: number | null): Priority {
  const info = EVENT_CATEGORIES[category];
  if (!info?.violent || mentions === null) return "information";
  if (mentions >= 20) return "critique";
  return mentions >= 6 ? "importante" : "information";
}

// --- Lignes → événements ----------------------------------------------------------------------------------------------------

function validCoords(lat: number | null, lon: number | null): boolean {
  return lat !== null && lon !== null && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

export function briefToEvent(row: BriefRow): BoardEvent {
  const geo = validCoords(row.latitude, row.longitude);
  return {
    id: `a-${row.id}`,
    kind: "article",
    title: row.title,
    summary: row.summary ?? undefined,
    theme: themeOfBrief(row.primary_theme, row.event_type),
    priority: priorityOfBrief(row.importance, row.event_type),
    verification: verificationOfBrief(row.veracity),
    at: new Date(row.published_at).toISOString(),
    place: row.place_name ?? row.place_country ?? "Lieu non précisé",
    lat: geo ? row.latitude! : undefined,
    lon: geo ? row.longitude! : undefined,
    publications: Math.max(1, row.source_count ?? row.source_urls?.length ?? 1),
    url: row.source_urls?.[0],
    domains: row.source_domains ?? [],
  };
}

export function eventToEvent(row: EventRow): BoardEvent {
  const info = EVENT_CATEGORIES[row.category];
  const geo = validCoords(row.latitude, row.longitude);
  let domain: string[] = [];
  try {
    if (row.source) domain = [new URL(row.source).hostname.replace(/^www\./, "")];
  } catch {
    /* adresse de source illisible : on garde l'événement sans domaine */
  }
  return {
    id: `e-${row.id}`,
    kind: "signal",
    title: `Signalement médiatique : ${(info?.label ?? row.category).toLowerCase()} (${row.country})${domain.length ? ` · ${domain[0]}` : ""}`,
    summary: row.summary ?? undefined,
    theme: info?.theme ?? "securite",
    priority: priorityOfEvent(row.category, row.num_mentions),
    verification: "signalement",
    at: new Date(`${row.event_date}T12:00:00Z`).toISOString(),
    place: row.country,
    lat: geo ? row.latitude : undefined,
    lon: geo ? row.longitude : undefined,
    publications: Math.max(1, row.num_mentions ?? 1),
    url: row.source ?? undefined,
    domains: domain,
  };
}

// --- Périmètre : pays → noms utilisés dans les tables -----------------------------------------------------------------------

function unaccent(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export interface CountryMatch {
  iso3: string;
  /** Nom français (utilisé par place_country dans les articles). */
  name: string;
  /** Libellés de pays tels qu'ils figurent dans conflict_events (souvent sans accents, parfois combinés comme « Israel / Palestine »). */
  eventNames: string[];
}

export function matchCountry(iso3: string): CountryMatch | null {
  const code = COUNTRY_CODES.find((entry) => entry.iso3 === iso3);
  if (!code) return null;
  const names = new Set<string>([code.name, unaccent(code.name)]);
  for (const [label, codes] of Object.entries(COUNTRY_TO_ISO3)) if (codes.includes(iso3)) names.add(label);
  return { iso3, name: code.name, eventNames: [...names] };
}

const BOARD_THEMES: readonly BoardTheme[] = ["conflits", "securite", "politique", "humanitaire"];

/**
 * Publication collectée → événement. Elle n'est ni classée par priorité (aucun tri par IA : « information ») ni vérifiée
 * (« signalement ») ; la raison du rattachement est conservée pour le panneau « sources et preuves ».
 */
export function matchToEvent(row: MatchRow, placeLabel: string): BoardEvent | null {
  const item = row.sv_items;
  if (!item || !item.published_at) return null;
  let host: string | null = null;
  try {
    host = new URL(item.url).hostname.replace(/^www./, "");
  } catch {
    /* adresse illisible : pas de domaine */
  }
  return {
    id: `p-${item.id}`,
    kind: "publication",
    title: item.title,
    summary: item.excerpt ?? undefined,
    theme: (BOARD_THEMES as readonly string[]).includes(row.theme) ? (row.theme as BoardTheme) : "securite",
    priority: "information",
    verification: "signalement",
    at: new Date(item.published_at).toISOString(),
    place: placeLabel,
    publications: 1,
    url: item.url,
    domains: [item.source_name, host].filter((value): value is string => !!value),
    reason: row.reason,
  };
}
