// Recherche globale : types, normalisation et recherche dans l'index statique (pays, acteurs des fiches pays).
// Les actualités et les analyses viennent de Supabase (app/api/search/route.ts) et reprennent ces mêmes types.
// Module léger et sans accès réseau : utilisable côté serveur comme côté navigateur.

export type SearchKind = "pays" | "actualites" | "analyses" | "entites";

export const SEARCH_KINDS: { id: SearchKind; label: string }[] = [
  { id: "pays", label: "Pays" },
  { id: "actualites", label: "Actualités" },
  { id: "analyses", label: "Analyses" },
  { id: "entites", label: "Entités" },
];

export interface SearchResult {
  kind: SearchKind;
  /** Petite étiquette au-dessus du titre (« Pays », « Point de situation », « Organisation »…). */
  label: string;
  title: string;
  /** Ligne de contexte sous le titre. */
  detail: string;
  href: string;
  /** Lien vers un site extérieur (article de presse) : ouvert dans un nouvel onglet. */
  external?: boolean;
  /** Date ISO, pour trier les résultats datés. */
  date?: string;
  /** ISO 3166-1 alpha-2 du pays concerné, pour le drapeau. */
  iso2?: string;
}

/** Types d'acteurs d'une fiche pays (types/country.ts, EntityRef). */
export type EntityTypeLabelKey = "Government" | "Military" | "Organization" | "Armed group" | "Foreign actor";

export interface SearchResponse {
  query: string;
  results: SearchResult[];
}

/** Longueur minimale d'une recherche (en dessous, trop de résultats pour être utiles). */
export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 80;

/** Minuscules, sans accents, ponctuation et tirets réduits à des espaces : « Côte d'Ivoire » = « cote d ivoire ». */
export function normalizeQuery(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Mots de la recherche (normalisés) : un résultat doit tous les contenir. */
export function queryTokens(query: string): string[] {
  return normalizeQuery(query).split(" ").filter(Boolean);
}

export interface IndexEntry {
  result: SearchResult;
  /** Texte normalisé dans lequel on cherche. */
  haystack: string;
  /** Texte normalisé du titre seul, pour classer ceux qui commencent par la recherche en premier. */
  title: string;
}

export function indexEntry(result: SearchResult, extra = ""): IndexEntry {
  const title = normalizeQuery(result.title);
  return { result, title, haystack: normalizeQuery(`${result.title} ${result.detail} ${extra}`) };
}

/** Meilleur classement d'abord : titre égal à la recherche, titre qui commence par elle, mot du titre, puis le reste. */
function score(entry: IndexEntry, query: string, tokens: string[]): number {
  if (entry.title === query) return 0;
  if (entry.title.startsWith(query)) return 1;
  if (tokens.every((token) => entry.title.split(" ").some((word) => word.startsWith(token)))) return 2;
  if (tokens.every((token) => entry.title.includes(token))) return 3;
  return 4;
}

/** Entrées de l'index qui contiennent tous les mots de la recherche, les plus pertinentes d'abord. */
export function searchIndex(index: readonly IndexEntry[], rawQuery: string, limit = 8): SearchResult[] {
  const query = normalizeQuery(rawQuery);
  const tokens = queryTokens(rawQuery);
  if (query.length < MIN_QUERY_LENGTH || tokens.length === 0) return [];
  return index
    .filter((entry) => tokens.every((token) => entry.haystack.includes(token)))
    .map((entry) => ({ entry, rank: score(entry, query, tokens) }))
    .sort((a, b) => a.rank - b.rank || a.entry.result.title.localeCompare(b.entry.result.title, "fr"))
    .slice(0, limit)
    .map(({ entry }) => entry.result);
}

/** Motif sûr pour un `ilike` PostgREST : les caractères joker et ceux qui cassent un filtre sont retirés. */
export function ilikePattern(query: string): string {
  const cleaned = query.replace(/[%_\\,()*"]/g, " ").replace(/\s+/g, " ").trim();
  return `%${cleaned}%`;
}

export function clampQuery(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
}
