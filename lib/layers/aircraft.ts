import { LAYER_FETCH_HEADERS } from "./fetchHeaders";

const MIL_AIRCRAFT_URL = "https://api.adsb.lol/v2/mil";
const FETCH_TIMEOUT_MS = 8000;

export interface MilitaryAircraft {
  hex: string;
  callsign: string | null;
  type: string | null;
  registration: string | null;
  lat: number;
  lon: number;
  altitude: number | null;
}

interface AdsbLolAircraft {
  hex?: string;
  flight?: string;
  t?: string;
  r?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | "ground";
}

/**
 * Global military aircraft, no API key required. Scoped to military
 * traffic (not all civilian air traffic — that's the existing OpenSky
 * feed on the dedicated Tracking page) since that's what's actually
 * relevant for an OSINT geopolitical globe, and it keeps the payload
 * small without needing OpenSky's MAX_AIRCRAFT-style capping.
 */
export async function fetchMilitaryAircraft(): Promise<MilitaryAircraft[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    // Connection: close — without it, Node/undici's keep-alive socket can
    // leave the build-time static-generation step hanging indefinitely
    // even after every fetch has resolved (observed directly: a bare
    // Node script doing these same fetches never exited on its own).
    const res = await fetch(MIL_AIRCRAFT_URL, {
      signal: controller.signal,
      headers: LAYER_FETCH_HEADERS,
    });
    if (!res.ok) {
      console.error(`adsb.lol responded ${res.status} ${res.statusText}`);
      return [];
    }

    const data = (await res.json()) as { ac?: AdsbLolAircraft[] };
    return (data.ac ?? [])
      .filter((a): a is AdsbLolAircraft & { hex: string; lat: number; lon: number } =>
        typeof a.hex === "string" && typeof a.lat === "number" && typeof a.lon === "number"
      )
      .map((a) => ({
        hex: a.hex,
        callsign: a.flight?.trim() || null,
        type: a.t ?? null,
        registration: a.r ?? null,
        lat: a.lat,
        lon: a.lon,
        altitude: typeof a.alt_baro === "number" ? a.alt_baro : null,
      }));
  } catch (err) {
    console.error("Failed to fetch military aircraft:", err);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}
