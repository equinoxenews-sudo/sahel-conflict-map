import { COUNTRY_PROFILES_LIST } from "../countries";
import { LAYER_FETCH_HEADERS } from "./fetchHeaders";

// Lancements spatiaux (Launch Library 2, sans clé, 15 requêtes par heure : deux par
// rendu de l'accueil, qui est mis en cache une heure) : les 60 derniers jours et les
// 30 prochains, avec pas de tir, pays, vue satellite du site, mission et chargement.

const PAST_DAYS = 60;
const FUTURE_DAYS = 30;
const API = "https://ll.thespacedevs.com/2.3.0/launches";
const FETCH_TIMEOUT_MS = 12000;

export interface Launch {
  id: string;
  name: string;
  /** Date effective (passé) ou prévue (à venir). */
  net: string | null;
  past: boolean;
  statusName: string | null;
  padName: string | null;
  location: string | null;
  country: string | null;
  countryIso2: string | null;
  /** Vue satellite du pas de tir. */
  padImage: string | null;
  provider: string | null;
  rocket: string | null;
  missionName: string | null;
  missionType: string | null;
  orbit: string | null;
  customers: string[];
  lat: number;
  lon: number;
}

interface Ll2 {
  id?: string;
  name?: string;
  net?: string;
  status?: { name?: string; abbrev?: string };
  launch_service_provider?: { name?: string };
  rocket?: { configuration?: { full_name?: string; name?: string } };
  mission?: { name?: string; type?: string; orbit?: { name?: string }; agencies?: { name?: string }[] } | null;
  pad?: {
    name?: string;
    latitude?: string | number;
    longitude?: string | number;
    map_image?: string | null;
    country?: { name?: string; alpha_2_code?: string; alpha_3_code?: string };
    location?: { name?: string; latitude?: string | number; longitude?: string | number };
  };
}

const STATUS_FR: Record<string, string> = {
  "Launch Successful": "Réussi",
  "Launch Failure": "Échec",
  "Launch was a Partial Failure": "Échec partiel",
  "Go for Launch": "Feu vert",
  "To Be Confirmed": "À confirmer",
  "To Be Determined": "Date à déterminer",
  "Launch in Flight": "En vol",
  "On Hold": "En attente",
};

/** Nature de la mission, en français (« non précisée » si la source l'ignore). */
const MISSION_FR: Record<string, string> = {
  Communications: "Communications",
  "Earth Science": "Observation de la Terre",
  "Government/Top Secret": "Militaire / gouvernemental (secret)",
  "Test Flight": "Vol d'essai",
  Navigation: "Navigation",
  Resupply: "Ravitaillement (station spatiale)",
  "Human Exploration": "Vol habité",
  Tourism: "Tourisme spatial",
  Astrophysics: "Astrophysique",
  "Planetary Science": "Exploration planétaire",
  Heliophysics: "Physique solaire",
  Robotic: "Mission robotique",
  "Dedicated Rideshare": "Lancement groupé (petits satellites)",
  Technology: "Démonstration technologique",
  Biology: "Biologie",
  Unknown: "Non précisée",
};

const FRENCH_BY_ISO3 = new Map<string, string>([
  // Pays de lancement absents des fiches pays du site.
  ["USA", "États-Unis"],
  ["CHN", "Chine"],
  ["RUS", "Russie"],
  ["JPN", "Japon"],
  ["IND", "Inde"],
  ["GUF", "Guyane française (France)"],
  ["FRA", "France"],
  ["NZL", "Nouvelle-Zélande"],
  ["KAZ", "Kazakhstan"],
  ["KOR", "Corée du Sud"],
  ["PRK", "Corée du Nord"],
  ["IRN", "Iran"],
  ["ISR", "Israël"],
  ["AUS", "Australie"],
  ["GBR", "Royaume-Uni"],
  ["NOR", "Norvège"],
  ...COUNTRY_PROFILES_LIST.map((c) => [c.iso3, c.name] as [string, string]),
]);

const ORBIT_FR: Record<string, string> = {
  "Low Earth Orbit": "Orbite basse",
  "Sun-Synchronous Orbit": "Orbite héliosynchrone",
  "Polar Orbit": "Orbite polaire",
  "Medium Earth Orbit": "Orbite moyenne",
  "Geostationary Orbit": "Orbite géostationnaire",
  "Geostationary Transfer Orbit": "Orbite de transfert géostationnaire",
  "Geosynchronous Orbit": "Orbite géosynchrone",
  "Highly Elliptical Orbit": "Orbite très elliptique",
  "Lunar Orbit": "Orbite lunaire",
  "Heliocentric N/A": "Orbite solaire",
  "Suborbital": "Suborbital",
  "Elliptical Orbit": "Orbite elliptique",
};

function num(v: string | number | undefined): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

async function load(url: string): Promise<Ll2[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: LAYER_FETCH_HEADERS });
    if (!res.ok) {
      console.error(`Launch Library responded ${res.status} ${res.statusText}`);
      return [];
    }
    const data = (await res.json()) as { results?: Ll2[] };
    return data.results ?? [];
  } catch (err) {
    console.error("Failed to fetch launches:", err);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

function toLaunch(l: Ll2, past: boolean): Launch | null {
  const lat = num(l.pad?.latitude) ?? num(l.pad?.location?.latitude);
  const lon = num(l.pad?.longitude) ?? num(l.pad?.location?.longitude);
  if (!l.id || !l.name || lat == null || lon == null) return null;
  const iso3 = l.pad?.country?.alpha_3_code;
  const type = l.mission?.type ?? "Unknown";
  return {
    id: l.id,
    name: l.name,
    net: l.net ?? null,
    past,
    statusName: l.status?.name ? (STATUS_FR[l.status.name] ?? l.status.name) : null,
    padName: l.pad?.name ?? null,
    location: l.pad?.location?.name ?? null,
    country: (iso3 && FRENCH_BY_ISO3.get(iso3)) || l.pad?.country?.name || null,
    countryIso2: l.pad?.country?.alpha_2_code ?? null,
    padImage: l.pad?.map_image ?? null,
    provider: l.launch_service_provider?.name ?? null,
    rocket: l.rocket?.configuration?.full_name ?? l.rocket?.configuration?.name ?? null,
    missionName: l.mission?.name ?? null,
    missionType: MISSION_FR[type] ?? type,
    orbit: l.mission?.orbit?.name ? (ORBIT_FR[l.mission.orbit.name] ?? l.mission.orbit.name) : null,
    customers: (l.mission?.agencies ?? []).map((a) => a.name).filter((n): n is string => !!n),
    lat,
    lon,
  };
}

export async function fetchLaunches(now = Date.now()): Promise<Launch[]> {
  const since = new Date(now - PAST_DAYS * 86_400_000).toISOString();
  const until = new Date(now + FUTURE_DAYS * 86_400_000).toISOString();
  const [previous, upcoming] = await Promise.all([
    load(`${API}/previous/?net__gte=${since}&limit=100&mode=normal`),
    load(`${API}/upcoming/?net__lte=${until}&limit=100&mode=normal`),
  ]);
  return [...previous.map((l) => toLaunch(l, true)), ...upcoming.map((l) => toLaunch(l, false))].filter(
    (l): l is Launch => l !== null,
  );
}

/** Ancien nom, conservé pour les appels existants. */
export const fetchUpcomingLaunches = fetchLaunches;
