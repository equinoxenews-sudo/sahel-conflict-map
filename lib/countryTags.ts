import { COUNTRY_CODES } from "./countryCodes";

// Tags pays des articles : l'analyste écrit les noms français des pays dont parle l'article, on les enregistre en codes ISO 3 (clé du
// globe, du panneau pays et des fiches). Module léger, utilisable côté navigateur comme côté serveur.

export const MAX_COUNTRY_TAGS = 5;

const normalize = (label: string) =>
  label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’`]/g, "'")
    .toLowerCase()
    .replace(/[-\s]+/g, " ")
    .trim();

// Appellations courantes qui diffèrent du nom officiel de la base.
const ALIASES: Record<string, string> = {
  usa: "USA",
  "etats unis": "USA",
  "etats unis d'amerique": "USA",
  "royaume uni": "GBR",
  "grande bretagne": "GBR",
  rdc: "COD",
  "rd congo": "COD",
  "congo kinshasa": "COD",
  "congo brazzaville": "COG",
  "republique du congo": "COG",
  "republique democratique du congo": "COD",
  birmanie: "MMR",
  swaziland: "SWZ",
  "republique tcheque": "CZE",
  tchequie: "CZE",
  macedoine: "MKD",
  "macedoine du nord": "MKD",
  "territoires palestiniens": "PSE",
  "bande de gaza": "PSE",
  cisjordanie: "PSE",
  turkiye: "TUR",
  "emirats arabes unis": "ARE",
  "timor leste": "TLS",
  "cote d'ivoire": "CIV",
  "coree du sud": "KOR",
  "coree du nord": "PRK",
  "russie": "RUS",
  "federation de russie": "RUS",
  "republique centrafricaine": "CAF",
  "centrafrique": "CAF",
  "cap vert": "CPV",
  "sao tome et principe": "STP",
  "vatican": "VAT",
  "etat de la cite du vatican": "VAT",
  hongkong: "HKG",
  "hong kong": "HKG",
  taiwan: "TWN",
};

const ISO3_BY_LABEL: ReadonlyMap<string, string> = new Map([
  ...COUNTRY_CODES.map((country) => [normalize(country.name), country.iso3] as const),
  ...Object.entries(ALIASES),
]);

const NAME_BY_ISO3: ReadonlyMap<string, string> = new Map([...COUNTRY_CODES.map((country) => [country.iso3, country.name] as const)]);
const ISO2_BY_ISO3: ReadonlyMap<string, string> = new Map(COUNTRY_CODES.map((country) => [country.iso3, country.iso2]));

/** Code ISO 3 d'un pays désigné par son nom français (ou une appellation courante), sinon null. */
export function iso3FromLabel(label: string): string | null {
  return ISO3_BY_LABEL.get(normalize(label)) ?? null;
}

/** Nom français courant d'un pays d'après son code ISO 3, sinon null. */
export function countryNameOf(iso3: string): string | null {
  return NAME_BY_ISO3.get(iso3) ?? null;
}

/** Code ISO 2 (drapeau) d'un pays d'après son code ISO 3, sinon null. */
export function iso2Of(iso3: string): string | null {
  return ISO2_BY_ISO3.get(iso3) ?? null;
}

/**
 * Tags pays d'une réponse de l'analyste : liste de noms de pays → codes ISO 3, sans doublon, dans l'ordre, au plus MAX_COUNTRY_TAGS.
 * Un nom inconnu est ignoré (jamais un tag inventé) et renvoyé dans `unknown` pour le journal.
 */
export function parseCountryTags(value: unknown): { iso3: string[]; unknown: string[] } {
  const iso3: string[] = [];
  const unknown: string[] = [];
  if (!Array.isArray(value)) return { iso3, unknown };
  for (const item of value) {
    if (typeof item !== "string" || !item.trim()) continue;
    const code = iso3FromLabel(item);
    if (!code) unknown.push(item.trim());
    else if (!iso3.includes(code) && iso3.length < MAX_COUNTRY_TAGS) iso3.push(code);
  }
  return { iso3, unknown };
}

/**
 * Pays cités dans un texte (rattrapage des articles déjà publiés) : un pays est retenu quand son nom apparaît en entier, en mot isolé.
 * Moins fin que l'analyste (un nom d'organisation ou de ville peut tromper), d'où les trois pays au plus, dans l'ordre d'apparition.
 */
export function countriesInText(text: string, limit = 3): string[] {
  const words = (label: string) => normalize(label).replace(/[^a-z0-9]+/g, " ").trim();
  const haystack = ` ${words(text)} `;
  const found: { iso3: string; at: number }[] = [];
  for (const [label, iso3] of ISO3_BY_LABEL) {
    const key = words(label);
    if (key.length < 4 || found.some((f) => f.iso3 === iso3)) continue;
    const at = haystack.indexOf(` ${key} `);
    if (at >= 0) found.push({ iso3, at });
  }
  return found.sort((a, b) => a.at - b.at).slice(0, limit).map((f) => f.iso3);
}

/** Autres écritures courantes d'un pays dans un titre (le nom français de la base est toujours cherché en premier). */
const DISPLAY_ALIASES: Record<string, string[]> = {
  USA: ["États-Unis", "Etats-Unis", "USA"],
  GBR: ["Royaume-Uni"],
  COD: ["RDC", "RD Congo", "Congo-Kinshasa"],
  COG: ["Congo-Brazzaville"],
  MMR: ["Birmanie"],
  PSE: ["Gaza", "Cisjordanie"],
  TUR: ["Türkiye"],
  CZE: ["République tchèque"],
  ARE: ["Émirats arabes unis", "Emirats arabes unis"],
  RUS: ["Russie"],
  CAF: ["Centrafrique"],
};

/** Écritures sous lesquelles un pays peut apparaître dans un texte (nom français, puis appellations courantes). */
export function searchTermsOf(iso3: string): string[] {
  const name = countryNameOf(iso3);
  return [...new Set([...(name ? [name] : []), ...(DISPLAY_ALIASES[iso3] ?? [])])];
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Vrai si un des termes figure en mot entier dans le texte (« Niger » ne correspond ni à « Nigeria » ni à « Nigérien »). */
export function mentionsAny(text: string, terms: readonly string[]): boolean {
  if (terms.length === 0) return false;
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(?:${terms.map(escapeRegExp).join("|")})(?![\\p{L}\\p{N}])`, "iu");
  return pattern.test(text);
}
