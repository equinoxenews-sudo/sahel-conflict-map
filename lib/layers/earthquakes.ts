import { LAYER_FETCH_HEADERS } from "./fetchHeaders";

// Séismes du monde entier (USGS, sans clé) :
// - magnitude 4 et plus sur les 60 derniers jours (catalogue mondial, ~2 000 séismes) ;
// - magnitude 2,5 et plus sur les 7 derniers jours, pour le détail récent.
// Tout l'historique est envoyé au globe : seul le filtre « Période » décide de l'affichage.

const HISTORY_DAYS = 60;
const MIN_MAGNITUDE_HISTORY = 4;
const WEEK_FEED_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson";
const FETCH_TIMEOUT_MS = 15000;

export interface Earthquake {
  id: string;
  place: string | null;
  magnitude: number;
  time: number;
  lat: number;
  lon: number;
  depthKm: number | null;
  /** Fiche USGS de l'événement. */
  url: string | null;
  /** Alerte PAGER (green, yellow, orange, red) : impact humain et économique estimé. */
  alert: string | null;
  tsunami: boolean;
  /** Nombre de témoignages « ressenti » reçus par l'USGS. */
  felt: number | null;
}

interface UsgsFeature {
  id?: string;
  properties?: {
    mag?: number | null;
    place?: string | null;
    time?: number;
    url?: string | null;
    alert?: string | null;
    tsunami?: number | null;
    felt?: number | null;
  };
  geometry?: { coordinates?: [number, number, number] };
}

async function load(url: string): Promise<UsgsFeature[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // Connection: close (LAYER_FETCH_HEADERS) — sans lui, la génération statique peut rester bloquée.
    const res = await fetch(url, { signal: controller.signal, headers: LAYER_FETCH_HEADERS });
    if (!res.ok) {
      console.error(`USGS earthquakes responded ${res.status} ${res.statusText} (${url})`);
      return [];
    }
    const data = (await res.json()) as { features?: UsgsFeature[] };
    return data.features ?? [];
  } catch (err) {
    console.error("Failed to fetch earthquakes:", err);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchEarthquakes(now = Date.now()): Promise<Earthquake[]> {
  const start = new Date(now - HISTORY_DAYS * 86_400_000).toISOString().slice(0, 10);
  const historyUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${start}&minmagnitude=${MIN_MAGNITUDE_HISTORY}&orderby=time&limit=5000`;
  const [history, week] = await Promise.all([load(historyUrl), load(WEEK_FEED_URL)]);
  const byId = new Map<string, Earthquake>();
  for (const f of [...history, ...week]) {
    const c = f.geometry?.coordinates;
    if (typeof f.id !== "string" || !Array.isArray(c) || byId.has(f.id)) continue;
    const p = f.properties ?? {};
    byId.set(f.id, {
      id: f.id,
      place: p.place ?? null,
      magnitude: p.mag ?? 0,
      time: p.time ?? 0,
      lon: c[0],
      lat: c[1],
      depthKm: c[2] ?? null,
      url: p.url ?? null,
      alert: p.alert ?? null,
      tsunami: p.tsunami === 1,
      felt: p.felt ?? null,
    });
  }
  return [...byId.values()].sort((a, b) => b.time - a.time);
}
