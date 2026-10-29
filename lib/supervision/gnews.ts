import type { Criteria, Zone } from "./model";

// Recherche Google Actualités d'une veille : les requêtes sont construites à partir de la zone (pays du centre et pays
// voisins qui touchent le cercle), des entités et mots-clés de la veille et des thèmes, puis lues comme des flux RSS
// (gratuit, sans clé). Cela ramène la presse locale que les flux d'Équinoxe ne couvrent pas. Les publications passent
// ensuite par la même correspondance et le même tri que les autres sources. Module pur : aucun accès réseau.

/** Pays de la zone, avec leurs noms (français et anglais), pour écrire les requêtes. */
export interface ZoneCountries {
  /** Pays du centre du cercle, ou tous les pays d'une zone « pays ». */
  home: string[];
  /** Pays voisins qui touchent le cercle (la bande frontalière) ; vide pour une zone « pays ». */
  neighbours: string[];
}

export type GnewsLang = "fr" | "en";

const RISK_FR = {
  terrorism: ["attaque", "attaques", "jihadistes", "terroristes", "enlèvement", "embuscade", "explosif", "bandits"],
  conflicts: ["militaire", "affrontements", "soldats", "armée"],
  crime_trafficking: ["braconnage", "contrebande", "trafic"],
} as const;
const RISK_EN = {
  terrorism: ["attack", "jihadists", "terrorists", "kidnapping", "ambush", "IED", "bandits"],
  conflicts: ["military", "clashes", "soldiers"],
  crime_trafficking: ["poaching", "smuggling", "trafficking"],
} as const;

/** Thèmes de sécurité utilisés quand la veille n'en choisit aucun. */
const DEFAULT_THEMES = ["terrorism", "conflicts"] as const;

const MAX_QUERIES = 12;
const MAX_ENTITY_CHUNKS = 6;
const ENTITY_CHUNK = 4;
/** Chargement d'historique (plus de 30 jours) : Google ne renvoie qu'une centaine de résultats par requête, classés par pertinence et non par date ; une requête par lieu garde la fenêtre de dates et ramène davantage. */
const HISTORY_FROM_DAYS = 30;
const HISTORY_MAX_QUERIES = 30;
const RISK_CHUNK = 12;
const MAX_QUERY_CHARS = 600;
/** Ancienneté (jours) des articles demandés à Google : plus que l'intervalle entre deux passages, pour ne rien perdre. */
export const DEFAULT_DAYS = 14;

/** Un terme prêt pour une requête : guillemets s'il comporte un espace, sans caractères qui casseraient la syntaxe. */
export function queryTerm(term: string): string {
  const clean = term.replace(/["()\\]/g, " ").replace(/\s+/g, " ").trim();
  return /\s/.test(clean) ? `"${clean}"` : clean;
}

const group = (terms: string[]) => `(${terms.map(queryTerm).filter((term) => term.length > 0).join(" OR ")})`;

function chunks<T>(values: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let start = 0; start < values.length; start += size) out.push(values.slice(start, start + size));
  return out;
}

const unique = (values: string[]) => [...new Map(values.map((value) => [value.toLocaleLowerCase("fr-FR"), value])).values()];

/** Termes de risque : thèmes de la veille (ou sécurité par défaut), puis ses mots-clés. */
export function riskTerms(criteria: Criteria, lang: GnewsLang): string[] {
  const table = lang === "fr" ? RISK_FR : RISK_EN;
  const themes = criteria.themes.length > 0 ? criteria.themes : [...DEFAULT_THEMES];
  const fromThemes = themes.flatMap((theme) => (table as Record<string, readonly string[]>)[theme] ?? []);
  // Les mots-clés de l'utilisateur ne sont pas traduits : ils servent tels quels, quelle que soit la langue de la requête.
  return unique([...fromThemes, ...criteria.keywords]);
}

/** La veille demande-t-elle des publications en anglais ? (« anglais », « english », « en »). */
export function wantsEnglish(criteria: Criteria): boolean {
  return criteria.languages.some((language) => /^(en|eng|english|anglais)$/i.test(language.trim()));
}

function finish(query: string, exclusions: string[], days: number): string {
  const minus = exclusions.slice(0, 5).map((term) => `-${queryTerm(term)}`);
  return [query, ...minus, `when:${days}d`].join(" ");
}

/**
 * Requêtes de la veille, de la plus large à la plus fine : pays du centre + risque ; entités de la veille + risque ;
 * pays voisins + pays du centre + risque (la bande frontalière). En anglais en plus si la veille le demande.
 */
export function buildGnewsQueries(zone: Zone, criteria: Criteria, countries: ZoneCountries, days: number = DEFAULT_DAYS): { query: string; lang: GnewsLang }[] {
  const out: { query: string; lang: GnewsLang }[] = [];
  const history = days > HISTORY_FROM_DAYS;
  const maxQueries = history ? HISTORY_MAX_QUERIES : MAX_QUERIES;
  const add = (query: string, lang: GnewsLang) => {
    const full = finish(query, criteria.exclusions, days);
    if (full.length <= MAX_QUERY_CHARS && out.length < maxQueries && !out.some((item) => item.query === full)) out.push({ query: full, lang });
  };
  const langs: GnewsLang[] = wantsEnglish(criteria) ? ["fr", "en"] : ["fr"];
  const home = unique(countries.home);
  const neighbours = unique(countries.neighbours).filter((name) => !home.some((h) => h.toLocaleLowerCase("fr-FR") === name.toLocaleLowerCase("fr-FR")));

  for (const lang of langs) {
    const risk = riskTerms(criteria, lang).slice(0, RISK_CHUNK);
    if (risk.length === 0) continue;
    if (home.length > 0) add(`${group(home)} ${group(risk)}`, lang);
    if (neighbours.length > 0 && home.length > 0 && zone.kind === "circle") add(`${group(neighbours)} ${group(home)} ${group(risk)}`, lang);
  }

  // Entités (lieux, groupes) : leurs noms sont les mêmes dans toutes les langues, une seule série suffit.
  const risk = riskTerms(criteria, "fr").slice(0, RISK_CHUNK);
  if (risk.length > 0) {
    const entityChunk = history ? 1 : ENTITY_CHUNK;
    const maxChunks = history ? HISTORY_MAX_QUERIES : MAX_ENTITY_CHUNKS;
    for (const chunk of chunks(unique(criteria.entities), entityChunk).slice(0, maxChunks)) add(`${group(chunk)} ${group(risk)}`, "fr");
  }
  return out;
}

/** Requête saisie par l'utilisateur : telle quelle, avec la limite d'ancienneté si elle n'en précise pas. */
export function customGnewsQuery(text: string, days: number = DEFAULT_DAYS): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return /\bwhen:/i.test(clean) ? clean : `${clean} when:${days}d`;
}

/** Adresse du flux RSS d'une recherche Google Actualités. */
export function googleNewsUrl(query: string, lang: GnewsLang): string {
  const edition = lang === "fr" ? "hl=fr&gl=FR&ceid=FR:fr" : "hl=en-US&gl=US&ceid=US:en";
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&${edition}`;
}
