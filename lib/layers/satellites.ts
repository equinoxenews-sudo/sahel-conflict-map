import * as satellite from "satellite.js";
import { LAYER_FETCH_HEADERS } from "./fetchHeaders";

// Satellites (CelesTrak, sans clé) : une douzaine de familles utiles à l'analyse plutôt que
// les ~10 000 objets actifs (dont 7 000 Starlink). Pour chacun : fonction (d'après sa
// famille), pays ou organisation propriétaire et date de lancement (catalogue SATCAT).
// Les positions sont calculées ici, côté serveur (voir plus bas pourquoi), à l'instant du
// rendu de l'accueil (mis en cache une heure).
//
// CelesTrak demande de ne pas recharger une même famille plus d'une fois toutes les deux
// heures : les éléments orbitaux sont gardés 2 h, le catalogue 24 h (cache de Next).

const GP_URL = "https://celestrak.org/NORAD/elements/gp.php";
const SATCAT_URL = "https://celestrak.org/satcat/records.php";
const FETCH_TIMEOUT_MS = 12000;
const TLE_REVALIDATE_S = 2 * 3600;
const SATCAT_REVALIDATE_S = 24 * 3600;

/** Familles suivies, avec leur fonction en clair. L'ordre fixe la fonction retenue quand un
 *  satellite appartient à plusieurs familles. */
const GROUPS: { id: string; fn: string }[] = [
  { id: "stations", fn: "Station spatiale / vol habité" },
  { id: "military", fn: "Militaire" },
  { id: "gps-ops", fn: "Navigation (GPS, États-Unis)" },
  { id: "galileo", fn: "Navigation (Galileo, Europe)" },
  { id: "glo-ops", fn: "Navigation (GLONASS, Russie)" },
  { id: "beidou", fn: "Navigation (BeiDou, Chine)" },
  { id: "weather", fn: "Météorologie" },
  { id: "resource", fn: "Observation de la Terre" },
  { id: "sarsat", fn: "Recherche et sauvetage" },
  { id: "science", fn: "Science" },
  { id: "geo", fn: "Télécommunications (orbite géostationnaire)" },
  { id: "iridium-NEXT", fn: "Télécommunications (Iridium)" },
  { id: "oneweb", fn: "Internet par satellite (OneWeb)" },
];

/** Propriétaire au sens du catalogue SATCAT : pays ou organisation, avec drapeau si possible. */
const OWNERS: Record<string, { name: string; iso2?: string }> = {
  US: { name: "États-Unis", iso2: "us" },
  PRC: { name: "Chine", iso2: "cn" },
  CIS: { name: "Russie (ex-URSS)", iso2: "ru" },
  FR: { name: "France", iso2: "fr" },
  ESA: { name: "Agence spatiale européenne", iso2: "eu" },
  EUME: { name: "EUMETSAT (Europe)", iso2: "eu" },
  EUTE: { name: "Eutelsat (Europe)", iso2: "eu" },
  JPN: { name: "Japon", iso2: "jp" },
  IND: { name: "Inde", iso2: "in" },
  UK: { name: "Royaume-Uni", iso2: "gb" },
  GER: { name: "Allemagne", iso2: "de" },
  IT: { name: "Italie", iso2: "it" },
  CA: { name: "Canada", iso2: "ca" },
  ISRA: { name: "Israël", iso2: "il" },
  SKOR: { name: "Corée du Sud", iso2: "kr" },
  NKOR: { name: "Corée du Nord", iso2: "kp" },
  IRAN: { name: "Iran", iso2: "ir" },
  TURK: { name: "Turquie", iso2: "tr" },
  UAE: { name: "Émirats arabes unis", iso2: "ae" },
  SAUD: { name: "Arabie saoudite", iso2: "sa" },
  BRAZ: { name: "Brésil", iso2: "br" },
  ARGN: { name: "Argentine", iso2: "ar" },
  SPN: { name: "Espagne", iso2: "es" },
  NOR: { name: "Norvège", iso2: "no" },
  AUS: { name: "Australie", iso2: "au" },
  SING: { name: "Singapour", iso2: "sg" },
  INDO: { name: "Indonésie", iso2: "id" },
  MEX: { name: "Mexique", iso2: "mx" },
  KAZ: { name: "Kazakhstan", iso2: "kz" },
  LUXE: { name: "Luxembourg", iso2: "lu" },
  NETH: { name: "Pays-Bas", iso2: "nl" },
  SWED: { name: "Suède", iso2: "se" },
  FIN: { name: "Finlande", iso2: "fi" },
  POL: { name: "Pologne", iso2: "pl" },
  SES: { name: "SES (Luxembourg)", iso2: "lu" },
  ITSO: { name: "Intelsat (organisation internationale)" },
  GLOB: { name: "Globalstar (États-Unis)", iso2: "us" },
  ORB: { name: "Orbcomm (États-Unis)", iso2: "us" },
  O3B: { name: "O3b / SES (Luxembourg)", iso2: "lu" },
  AB: { name: "Arabsat (Ligue arabe)" },
  NATO: { name: "OTAN" },
  ISS: { name: "Station spatiale internationale (coopération)" },
  EGYP: { name: "Égypte", iso2: "eg" },
  ALG: { name: "Algérie", iso2: "dz" },
  NIG: { name: "Nigeria", iso2: "ng" },
  SAFR: { name: "Afrique du Sud", iso2: "za" },
  PAKI: { name: "Pakistan", iso2: "pk" },
  THAI: { name: "Thaïlande", iso2: "th" },
  MALA: { name: "Malaisie", iso2: "my" },
  VTNM: { name: "Viêt Nam", iso2: "vn" },
  PHIL: { name: "Philippines", iso2: "ph" },
  NZ: { name: "Nouvelle-Zélande", iso2: "nz" },
};

interface Tle {
  name: string;
  line1: string;
  line2: string;
}

export interface SatellitePosition {
  name: string;
  lat: number;
  lon: number;
  altitudeMeters: number;
  norad: number | null;
  /** Désignation internationale (année et rang du lancement), ex. « 1998-067A ». */
  intlDesignator: string | null;
  fn: string;
  owner: string | null;
  ownerIso2: string | null;
  launchDate: string | null;
}

function parseTle(text: string): Tle[] {
  const lines = text.split("\n").map((l) => l.trimEnd());
  const tles: Tle[] = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i].trim();
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];
    if (name && line1?.startsWith("1 ") && line2?.startsWith("2 ")) tles.push({ name, line1, line2 });
  }
  return tles;
}

async function get(url: string, revalidate: number): Promise<Response | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // Connection: close (LAYER_FETCH_HEADERS) — sans lui, la génération statique peut rester bloquée.
    const res = await fetch(url, { signal: controller.signal, headers: LAYER_FETCH_HEADERS, next: { revalidate } });
    if (!res.ok) {
      console.error(`CelesTrak responded ${res.status} (${url})`);
      return null;
    }
    return res;
  } catch (err) {
    console.error(`Failed to fetch CelesTrak (${url}):`, err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchGroup(group: string): Promise<Tle[]> {
  const res = await get(`${GP_URL}?GROUP=${encodeURIComponent(group)}&FORMAT=tle`, TLE_REVALIDATE_S);
  return res ? parseTle(await res.text()) : [];
}

interface SatcatRecord {
  NORAD_CAT_ID?: number;
  OWNER?: string;
  LAUNCH_DATE?: string;
}

async function fetchSatcat(group: string): Promise<SatcatRecord[]> {
  const res = await get(`${SATCAT_URL}?GROUP=${encodeURIComponent(group)}&FORMAT=json`, SATCAT_REVALIDATE_S);
  if (!res) return [];
  try {
    const data = (await res.json()) as SatcatRecord[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Numéro NORAD (colonnes 3-7) et désignation internationale (colonnes 10-17) de la ligne 1. */
export function tleIds(line1: string): { norad: number | null; intl: string | null } {
  const norad = Number(line1.slice(2, 7));
  const raw = line1.slice(9, 17).trim();
  let intl: string | null = null;
  if (/^\d{5}[A-Z]{1,3}$/.test(raw)) {
    const yy = Number(raw.slice(0, 2));
    intl = `${yy < 57 ? 2000 + yy : 1900 + yy}-${raw.slice(2, 5)}${raw.slice(5)}`;
  }
  return { norad: Number.isFinite(norad) && norad > 0 ? norad : null, intl };
}

/**
 * Positions calculées entièrement côté serveur : satellite.js n'est jamais importé par un
 * composant client (le livrer au navigateur a déjà bloqué la compilation de production, puis
 * provoqué une erreur de syntaxe après minification). Le client ne reçoit que des nombres ;
 * contrepartie : une position figée à l'instant du rendu (cache d'une heure).
 */
export async function fetchSatellitePositions(): Promise<SatellitePosition[]> {
  const [groups, catalogs] = await Promise.all([
    Promise.all(GROUPS.map((g) => fetchGroup(g.id))),
    Promise.all(GROUPS.map((g) => fetchSatcat(g.id))),
  ]);
  const catalog = new Map<number, SatcatRecord>();
  for (const r of catalogs.flat()) if (typeof r.NORAD_CAT_ID === "number") catalog.set(r.NORAD_CAT_ID, r);

  // Un satellite présent dans plusieurs familles garde la première (ordre de GROUPS).
  const byNorad = new Map<string, { tle: Tle; fn: string }>();
  groups.forEach((tles, i) => {
    for (const tle of tles) {
      const key = String(tleIds(tle.line1).norad ?? tle.name);
      if (!byNorad.has(key)) byNorad.set(key, { tle, fn: GROUPS[i].fn });
    }
  });

  const now = new Date();
  const gmst = satellite.gstime(now);
  const positions: SatellitePosition[] = [];
  for (const { tle, fn } of byNorad.values()) {
    try {
      const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
      const eci = satellite.propagate(satrec, now)?.position;
      if (!eci || typeof eci === "boolean") continue;
      const geo = satellite.eciToGeodetic(eci, gmst);
      const { norad, intl } = tleIds(tle.line1);
      const rec = norad != null ? catalog.get(norad) : undefined;
      const owner = rec?.OWNER ? (OWNERS[rec.OWNER] ?? { name: rec.OWNER }) : null;
      positions.push({
        name: tle.name,
        lat: satellite.degreesLat(geo.latitude),
        lon: satellite.degreesLong(geo.longitude),
        altitudeMeters: geo.height * 1000,
        norad,
        intlDesignator: intl,
        fn,
        owner: owner?.name ?? null,
        ownerIso2: owner?.iso2 ?? null,
        launchDate: rec?.LAUNCH_DATE ?? (intl ? `${intl.slice(0, 4)}` : null),
      });
    } catch {
      // Éléments orbitaux invalides ou objet retombé : ignoré, sans effet sur les autres.
    }
  }
  return positions;
}
