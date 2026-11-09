// Supervision V1, Lot 4 : requêtes de recherche d'une Supervision (Google Actualités lu comme un flux RSS : gratuit, sans clé, sans IA).
// Module PUR : il construit des adresses, il n'appelle rien.

import { COUNTRY_CODES } from "../../countryCodes";
import type { ScopeSnapshot } from "../core/majorChange";
import { OBJECTIVE_TERMS, countryName, type Lang } from "./terms";

export interface SearchQuery {
  query: string;
  lang: Lang;
  url: string;
}

/** Ancienneté demandée à Google : plus longue que l'intervalle entre deux passages, pour ne rien manquer. */
export const DEFAULT_DAYS = 14;
const MAX_QUERIES = 10;
const MAX_QUERY_CHARS = 500;
const USER_TERM_CHUNK = 4;

/** Un terme prêt pour une requête : guillemets s'il comporte un espace, sans caractère qui casserait la syntaxe. */
export function queryTerm(term: string): string {
  const clean = term.replace(/["()\\]/g, " ").replace(/\s+/g, " ").trim();
  return /\s/.test(clean) ? `"${clean}"` : clean;
}

const group = (terms: readonly string[]) => `(${terms.map(queryTerm).filter((term) => term.length > 0).join(" OR ")})`;

export function googleNewsUrl(query: string, lang: Lang): string {
  const edition = lang === "fr" ? "hl=fr&gl=FR&ceid=FR:fr" : "hl=en-US&gl=US&ceid=US:en";
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&${edition}`;
}

/** Noms du pays dans les deux langues, sans doublon (« Nigeria » est le même mot des deux côtés). */
export function countryNames(iso3: string): { fr: string; en: string; names: string[] } | null {
  const code = COUNTRY_CODES.find((entry) => entry.iso3 === iso3);
  if (!code) return null;
  const fr = code.name;
  const en = countryName(code.iso2, "en");
  return { fr, en, names: [...new Set([fr, en])] };
}

function chunks<T>(values: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let start = 0; start < values.length; start += size) out.push(values.slice(start, start + size));
  return out;
}

/**
 * Requêtes d'une Supervision, de la plus large à la plus fine :
 *  1. pays + termes de l'objectif, en français puis en anglais ;
 *  2. pays + mots-clés de l'utilisateur, par petits groupes ;
 *  3. pays + entités (lieux, groupes) de l'utilisateur, par petits groupes.
 * Zone « cercle » : pas encore prise en charge (elle viendra avec le périmètre dessiné) : aucune requête.
 */
export function buildQueries(snapshot: ScopeSnapshot, days: number = DEFAULT_DAYS): SearchQuery[] {
  const zone = snapshot.scope.primaryZone;
  if (zone.kind !== "countries") return [];
  const objective = OBJECTIVE_TERMS[snapshot.scope.objective];
  const out: SearchQuery[] = [];
  const add = (query: string, lang: Lang) => {
    const full = `${query} when:${days}d`;
    if (full.length <= MAX_QUERY_CHARS && out.length < MAX_QUERIES && !out.some((entry) => entry.query === full)) out.push({ query: full, lang, url: googleNewsUrl(full, lang) });
  };

  for (const iso3 of zone.codes) {
    const names = countryNames(iso3);
    if (!names) continue;
    for (const lang of ["fr", "en"] as Lang[]) {
      const place = lang === "fr" ? names.fr : names.en;
      if (objective) add(`${queryTerm(place)} ${group(objective[lang])}`, lang);
    }
    for (const chunk of chunks(snapshot.scope.keywords, USER_TERM_CHUNK)) add(`${queryTerm(names.fr)} ${group(chunk)}`, "fr");
    for (const chunk of chunks(snapshot.scope.entities, USER_TERM_CHUNK)) add(`${queryTerm(names.fr)} ${group(chunk)}`, "fr");
  }
  return out;
}
