import { LAYER_FETCH_HEADERS } from "./fetchHeaders";

// Avions militaires du monde entier (ADS-B, sans clé). Deux réseaux de récepteurs
// bénévoles interrogés ensemble, sans doublon : si l'un refuse ou tarde (adsb.lol ne
// répondait plus depuis les serveurs du site le 18/10/2026), l'autre suffit.
// Seuls les appareils qui émettent leur position apparaissent : une centaine en général.

const SOURCES = ["https://opendata.adsb.fi/api/v2/mil", "https://api.adsb.lol/v2/mil"];
const FETCH_TIMEOUT_MS = 8000;

export interface MilitaryAircraft {
  hex: string;
  callsign: string | null;
  /** Code de type OACI (« C17 », « K35R »…). */
  type: string | null;
  /** Désignation complète (« Boeing C-17A Globemaster III »). */
  description: string | null;
  registration: string | null;
  /** Opérateur déclaré (armée de l'air, marine…). */
  operator: string | null;
  lat: number;
  lon: number;
  /** Altitude barométrique en pieds (null au sol ou inconnue). */
  altitude: number | null;
  /** Vitesse sol en nœuds. */
  speed: number | null;
  /** Cap en degrés. */
  heading: number | null;
  squawk: string | null;
}

interface AdsbAircraft {
  hex?: string;
  flight?: string;
  t?: string;
  desc?: string;
  r?: string;
  ownOp?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | "ground";
  gs?: number;
  track?: number;
  squawk?: string;
}

async function load(url: string): Promise<AdsbAircraft[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // Connection: close (LAYER_FETCH_HEADERS) — sans lui, la génération statique peut rester bloquée.
    const res = await fetch(url, { signal: controller.signal, headers: LAYER_FETCH_HEADERS });
    if (!res.ok) {
      console.error(`Military aircraft source responded ${res.status} (${url})`);
      return [];
    }
    const data = (await res.json()) as { ac?: AdsbAircraft[] };
    return data.ac ?? [];
  } catch (err) {
    console.error("Failed to fetch military aircraft:", url, err);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchMilitaryAircraft(): Promise<MilitaryAircraft[]> {
  const lists = await Promise.all(SOURCES.map(load));
  const byHex = new Map<string, MilitaryAircraft>();
  for (const a of lists.flat()) {
    if (typeof a.hex !== "string" || typeof a.lat !== "number" || typeof a.lon !== "number" || byHex.has(a.hex)) continue;
    byHex.set(a.hex, {
      hex: a.hex,
      callsign: a.flight?.trim() || null,
      type: a.t ?? null,
      description: a.desc ?? null,
      registration: a.r ?? null,
      operator: a.ownOp ?? null,
      lat: a.lat,
      lon: a.lon,
      altitude: typeof a.alt_baro === "number" ? a.alt_baro : null,
      speed: typeof a.gs === "number" ? a.gs : null,
      heading: typeof a.track === "number" ? a.track : null,
      squawk: a.squawk ?? null,
    });
  }
  return [...byHex.values()];
}
