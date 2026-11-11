// Supervision V1, Lot 10 : règles d'alerte choisies par l'utilisateur (cahier des charges, section 6.2 : « géographie, thématiques,
// entités, priorité minimale »). Module PUR et testé : aucune base, aucun réseau, aucune IA.
//
// Ces règles RESTREIGNENT ce qui est envoyé par e-mail (immédiat et digest) ; elles n'ajoutent jamais une alerte : une alerte reste un
// événement critique ou important du tableau. La priorité minimale est déjà portée par les niveaux d'e-mail immédiat choisis.
//  - thèmes : si la liste n'est pas vide, seul un événement de l'un de ces thèmes est retenu ;
//  - mots-clés (lieux, entités, sujets) : si la liste n'est pas vide, l'événement doit en citer AU MOINS UN (titre, résumé ou lieu) ;
//  - exclusions : un événement qui cite l'un de ces termes est écarté, quoi qu'il cite d'autre.
// Comparaison sans accents ni majuscules, sur des mots ou groupes de mots entiers (« Lagos » ne correspond pas à « Lagoon »).

import type { BoardEvent } from "../dashboard/fixtures";

export const FILTER_THEMES = ["conflits", "securite", "politique", "humanitaire"] as const;
export type FilterTheme = (typeof FILTER_THEMES)[number];

export const FILTER_TERM_MIN = 2;
export const FILTER_TERM_MAX = 60;
export const FILTER_TERMS_MAX = 10;

export interface AlertFilters {
  themes: FilterTheme[];
  keywords: string[];
  exclusions: string[];
}

export const EMPTY_FILTERS: AlertFilters = { themes: [], keywords: [], exclusions: [] };

export const THEME_LABELS: Record<FilterTheme, string> = { conflits: "conflits", securite: "sécurité", politique: "politique", humanitaire: "humanitaire" };

export const isFilterTheme = (value: unknown): value is FilterTheme => (FILTER_THEMES as readonly unknown[]).includes(value);

/** Forme comparable : minuscules, sans accents, ponctuation en espaces, espaces simples, bordée d'espaces pour chercher des mots entiers. */
export function comparable(text: string): string {
  return ` ${text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

export type FiltersInput = { ok: true; value: AlertFilters } | { ok: false; errors: string[] };

function cleanTerms(raw: unknown, label: string, errors: string[]): string[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    errors.push(`${label} : une liste est attendue.`);
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") {
      errors.push(`${label} : chaque élément doit être un texte.`);
      continue;
    }
    // Une ligne de texte simple : caractères de contrôle retirés, espaces regroupés.
    const term = entry.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
    if (term.length === 0) continue;
    if (term.length < FILTER_TERM_MIN || term.length > FILTER_TERM_MAX) {
      errors.push(`${label} : « ${term.slice(0, 20)}${term.length > 20 ? "…" : ""} » doit faire de ${FILTER_TERM_MIN} à ${FILTER_TERM_MAX} caractères.`);
      continue;
    }
    if (comparable(term).trim().length === 0) {
      errors.push(`${label} : « ${term} » ne contient ni lettre ni chiffre.`);
      continue;
    }
    const key = comparable(term);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(term);
  }
  if (out.length > FILTER_TERMS_MAX) {
    errors.push(`${label} : ${FILTER_TERMS_MAX} termes au plus.`);
    return out.slice(0, FILTER_TERMS_MAX);
  }
  return out;
}

/** Saisie { themes, keywords, exclusions } ; absente ou vide = aucune restriction. */
export function validateFilters(payload: unknown): FiltersInput {
  if (payload === undefined || payload === null) return { ok: true, value: { ...EMPTY_FILTERS } };
  const record = typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  if (!record) return { ok: false, errors: ["Les règles d'alerte sont invalides."] };
  const errors: string[] = [];
  const themes: FilterTheme[] = [];
  if (record.themes !== undefined && record.themes !== null) {
    if (!Array.isArray(record.themes)) errors.push("Thèmes : une liste est attendue.");
    else {
      for (const theme of record.themes) {
        if (!isFilterTheme(theme)) {
          errors.push("Thèmes : un thème est inconnu (conflits, sécurité, politique ou humanitaire).");
          break;
        }
        if (!themes.includes(theme)) themes.push(theme);
      }
    }
  }
  const keywords = cleanTerms(record.keywords, "Mots-clés", errors);
  const exclusions = cleanTerms(record.exclusions, "Exclusions", errors);
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: { themes: FILTER_THEMES.filter((theme) => themes.includes(theme)), keywords, exclusions } };
}

/** Lecture tolérante de ce que la base renvoie (colonne JSON) : jamais d'exception, une valeur illisible vaut « aucune restriction ». */
export function filtersOf(raw: unknown): AlertFilters {
  if (typeof raw !== "object" || raw === null) return { ...EMPTY_FILTERS };
  const record = raw as Record<string, unknown>;
  const terms = (value: unknown) => (Array.isArray(value) ? value.filter((term): term is string => typeof term === "string" && term.length > 0).slice(0, FILTER_TERMS_MAX) : []);
  return { themes: Array.isArray(record.themes) ? FILTER_THEMES.filter((theme) => (record.themes as unknown[]).includes(theme)) : [], keywords: terms(record.keywords), exclusions: terms(record.exclusions) };
}

export const hasFilters = (filters: AlertFilters) => filters.themes.length + filters.keywords.length + filters.exclusions.length > 0;

const mentions = (haystack: string, term: string) => haystack.includes(comparable(term));

/** Un événement passe-t-il les règles ? Sans règle, tout passe. Les exclusions l'emportent toujours. */
export function matchesFilters(event: Pick<BoardEvent, "theme" | "title" | "summary" | "place">, filters: AlertFilters): boolean {
  if (filters.themes.length > 0 && !filters.themes.includes(event.theme as FilterTheme)) return false;
  const text = comparable(`${event.title} ${event.summary ?? ""} ${event.place ?? ""}`);
  if (filters.exclusions.some((term) => mentions(text, term))) return false;
  if (filters.keywords.length > 0 && !filters.keywords.some((term) => mentions(text, term))) return false;
  return true;
}

/** Phrase lisible des règles actives, pour le panneau et les messages. */
export function describeFilters(filters: AlertFilters): string {
  if (!hasFilters(filters)) return "Aucune restriction : toutes les alertes des niveaux choisis sont envoyées.";
  const parts: string[] = [];
  if (filters.themes.length > 0) parts.push(`thèmes : ${filters.themes.map((theme) => THEME_LABELS[theme]).join(", ")}`);
  if (filters.keywords.length > 0) parts.push(`citant l'un de : ${filters.keywords.join(", ")}`);
  if (filters.exclusions.length > 0) parts.push(`sans : ${filters.exclusions.join(", ")}`);
  return `Seules les alertes ${parts.join(" ; ")}.`;
}
