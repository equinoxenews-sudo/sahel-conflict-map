// Conseils aux voyageurs du ministère de l'Europe et des Affaires étrangères (France Diplomatie). Le contenu du site est
// publié sous Licence Ouverte Etalab 2.0 : réutilisation permise avec mention de la source. Il n'existe ni API ni jeu de
// données ouvert pour ces niveaux : chaque page « Sécurité » de pays porte une carte des zones de vigilance (image
// JPG, légende à quatre couleurs). Le script scripts/gen-travel-advisories.ts mesure la surface de chaque couleur de
// cette carte pour en tirer le niveau qui s'applique à l'essentiel du pays et le niveau le plus grave qu'on y trouve.
// Les contours des zones dans un pays ne sont pas repris : un pays n'a qu'une couleur (ou des rayures s'il mêle
// plusieurs niveaux). Module pur, sans accès réseau.

export type AdvisoryLevel = "green" | "yellow" | "orange" | "red";

/** Du moins grave au plus grave. */
export const LEVEL_ORDER: readonly AdvisoryLevel[] = ["green", "yellow", "orange", "red"];

export const LEVEL_LABELS: Record<AdvisoryLevel, string> = {
  green: "Vigilance normale",
  yellow: "Vigilance renforcée",
  orange: "Déconseillé sauf raison impérative",
  red: "Formellement déconseillé",
};

/** Couleurs de la légende du ministère (rouge, orange, jaune, vert), telles que mesurées sur ses cartes. */
export const LEVEL_PALETTE: Record<AdvisoryLevel, [number, number, number]> = {
  red: [224, 15, 24],
  orange: [248, 166, 76],
  yellow: [255, 247, 178],
  green: [197, 215, 109],
};

/** Couleurs d'affichage sur le globe (plus saturées que la légende : elles se posent sur un fond sombre). */
export const LEVEL_DISPLAY_COLORS: Record<AdvisoryLevel, string> = {
  green: "#a8c85a",
  yellow: "#f5e26a",
  orange: "#f5a04a",
  red: "#e01018",
};

export interface Advisory {
  iso2: string;
  /** Code ISO 3 du fond de carte du globe ; les pays absents de ce fond (petites îles) n'ont pas d'entrée. */
  iso3: string;
  slug: string;
  name: string;
  /** Niveau qui s'applique à l'essentiel du pays (surface de couleur dominante de la carte). */
  level: AdvisoryLevel;
  /** Niveau le plus grave présent dans le pays (au moins 3 % de la surface colorée). */
  worst: AdvisoryLevel;
  /** Vrai si le pays mêle des zones plus graves que son niveau principal. */
  partial: boolean;
  /** Part de chaque niveau dans la surface colorée de la carte, en pourcentage entier. */
  shares: Record<AdvisoryLevel, number>;
  /** Début du texte du ministère sur les zones, pour la bulle d'information. */
  summary: string;
  /** Adresse de la page du ministère. */
  url: string;
  /** Date de la carte du ministère (AAAA-MM-JJ), quand elle figure dans le nom du fichier. */
  mapDate: string | null;
}

export interface AdvisoryFile {
  updatedAt: string;
  source: string;
  licence: string;
  advisories: Advisory[];
}

const severity = (level: AdvisoryLevel) => LEVEL_ORDER.indexOf(level);

// --- Mesure de la carte ---------------------------------------------------------------------------------------------

/** Distance (RVB) en dessous de laquelle un pixel est compté dans une couleur de la légende. */
const COLOR_TOLERANCE = 36;
/** Bas de l'image ignoré : la légende (quatre pastilles de couleur) y figure et fausserait la mesure. */
const LEGEND_SHARE = 0.12;
/** Part minimale de la surface colorée pour qu'un niveau plus grave compte comme « présent » dans le pays. */
export const WORST_MIN_SHARE = 0.03;
/** Surface colorée minimale (pixels) pour qu'une carte soit exploitable. */
const MIN_COLORED_PIXELS = 400;

export type PixelCounts = Record<AdvisoryLevel, number>;

/** Compte les pixels de chaque couleur de la légende dans une image RVB (3 octets par pixel), hors bandeau du bas. */
export function countMapPixels(rgb: Uint8Array, width: number, height: number): PixelCounts {
  const counts: PixelCounts = { green: 0, yellow: 0, orange: 0, red: 0 };
  const limit = Math.floor(height * (1 - LEGEND_SHARE));
  const max = COLOR_TOLERANCE * COLOR_TOLERANCE;
  for (let y = 0; y < limit; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const r = rgb[i];
      const g = rgb[i + 1];
      const b = rgb[i + 2];
      let best: AdvisoryLevel | null = null;
      let bestDistance = max;
      for (const level of LEVEL_ORDER) {
        const [pr, pg, pb] = LEVEL_PALETTE[level];
        const distance = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = level;
        }
      }
      if (best) counts[best] += 1;
    }
  }
  return counts;
}

export interface LevelReading {
  level: AdvisoryLevel;
  worst: AdvisoryLevel;
  partial: boolean;
  shares: Record<AdvisoryLevel, number>;
}

/** Niveau d'un pays d'après les surfaces de couleur de sa carte ; null si la carte est inexploitable. */
export function readLevels(counts: PixelCounts): LevelReading | null {
  const total = LEVEL_ORDER.reduce((sum, level) => sum + counts[level], 0);
  if (total < MIN_COLORED_PIXELS) return null;
  const level = LEVEL_ORDER.reduce((a, b) => (counts[b] > counts[a] ? b : a));
  const share = (l: AdvisoryLevel) => counts[l] / total;
  const worst = [...LEVEL_ORDER].reverse().find((l) => share(l) >= WORST_MIN_SHARE) ?? level;
  const shares = Object.fromEntries(LEVEL_ORDER.map((l) => [l, Math.round(share(l) * 100)])) as Record<AdvisoryLevel, number>;
  return { level, worst: severity(worst) > severity(level) ? worst : level, partial: severity(worst) > severity(level), shares };
}

/**
 * Repli pour une page sans carte : « formellement déconseillé » sans aucun autre niveau cité (ni « sauf raison impérative »,
 * ni vigilance renforcée ou normale) vaut pour tout le pays. Tout autre cas reste sans réponse plutôt que deviné.
 */
export function levelFromText(text: string): LevelReading | null {
  if (!/formellement d[ée]conseill/i.test(text)) return null;
  if (/sauf raison imp[ée]rative|vigilance renforc[ée]e|vigilance normale/i.test(text)) return null;
  return { level: "red", worst: "red", partial: false, shares: { green: 0, yellow: 0, orange: 0, red: 100 } };
}

// --- Liens avec le fond de carte du globe ---------------------------------------------------------------------------

/** Codes ISO 3 du fond de carte (public/data/world-countries.geo.json) quand son nom diffère de celui de l'ISO. */
export const ISO3_BY_ISO2: Record<string, string> = {
  BS: "BHS",
  BA: "BIH",
  CI: "CIV",
  CD: "COD",
  CG: "COG",
  CZ: "CZE",
  FJ: "FJI",
  IL: "ISR",
  MK: "MKD",
  MM: "MMR",
  RS: "SRB",
  SZ: "SWZ",
  TL: "TLS",
  TT: "TTO",
  TR: "TUR",
  TZ: "TZA",
  US: "USA",
};

export function foldName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Pays dont la page du ministère n'a pas de drapeau lisible : code ISO 2 forcé. */
export const ISO2_BY_SLUG: Record<string, string> = {
  birmanie: "MM",
  "iles-fidji": "FJ",
  "israel-palestine": "IL",
  "republique-tcheque": "CZ",
};

/** Code ISO 3 du fond de carte d'un pays : table des exceptions, sinon nom anglais de l'ISO 2 (`englishName`). */
export function resolveIso3(iso2: string, englishName: string, geoByName: ReadonlyMap<string, string>): string | null {
  return ISO3_BY_ISO2[iso2] ?? geoByName.get(foldName(englishName)) ?? null;
}

// --- Lecture des pages du ministère ---------------------------------------------------------------------------------

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&#0?39;|&rsquo;|&#8217;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Texte de la section « Zones de vigilance » (jusqu'aux risques et recommandations), ou chaîne vide. */
export function zonesSection(html: string): string {
  const main = html.includes("<main") ? html.slice(html.indexOf("<main")) : html;
  const start = main.search(/<h[2-4][^>]*>\s*Zones? (de|à) vigilance/i);
  if (start < 0) return "";
  const rest = main.slice(start);
  const stop = rest.search(/<h2[^>]*>\s*(Risques|Recommandations|Suivez|Liste des repr)/i);
  return stripHtml(rest.slice(0, stop > 0 ? stop : rest.length));
}

export function countryNameOf(html: string): string {
  const match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  return match ? stripHtml(match[1]) : "";
}

export function flagIso2(html: string): string | null {
  const match = /drapeaux\/([a-z]{2})\.svg/i.exec(html);
  return match ? match[1].toUpperCase() : null;
}

/** Adresse de la carte des zones de la page (premier fichier sous /files/files/cav/), ou null. */
export function mapImagePath(html: string): string | null {
  const match = /<img[^>]*src="([^"]*\/files\/files\/cav\/[^"]+)"/i.exec(html);
  return match ? match[1] : null;
}

/** Date AAAA-MM-JJ lue dans le nom du fichier de la carte (« 20251112_benin-fcv.jpg »), ou null. */
export function mapDateOf(path: string): string | null {
  const match = /\/(\d{4})(\d{2})(\d{2})[_-]/.exec(path);
  if (!match) return null;
  const [, y, m, d] = match;
  return Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31 ? `${y}-${m}-${d}` : null;
}

/** Début du texte du ministère sur les zones, borné, pour la bulle d'information. */
export function summaryOf(text: string, max = 420): string {
  const clean = text.replace(/^Zones? (de|à) vigilance\s*/i, "").replace(/^Zones? (de|à) vigilance\s*/i, "").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 40)).trimEnd()}…`;
}

// --- Contours pour le globe -----------------------------------------------------------------------------------------

/**
 * Allège un anneau de polygone (liste de [lon, lat], premier point répété à la fin) à `max` points au plus, en gardant
 * un point sur k et en refermant l'anneau. Cesium plante au remplissage des très gros contours (Russie, Antarctique) :
 * pour un aplat de couleur, un contour allégé suffit.
 */
export function thinRing<T extends number[]>(ring: readonly T[], max: number): T[] {
  if (ring.length <= max) return [...ring];
  const step = Math.ceil(ring.length / (max - 1));
  const kept: T[] = [];
  for (let i = 0; i < ring.length - 1; i += step) kept.push(ring[i]);
  kept.push(kept[0]);
  return kept;
}
