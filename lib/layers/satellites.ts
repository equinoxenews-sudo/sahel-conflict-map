import * as satellite from "satellite.js";
import { LAYER_FETCH_HEADERS } from "./fetchHeaders";

const CELESTRAK_URL = "https://celestrak.org/NORAD/elements/gp.php";
// CelesTrak is noticeably less reliable than this project's other free
// data sources (observed directly: connections regularly fail outright
// rather than just responding slowly) — a longer timeout gives a
// borderline-slow response a chance without helping a hard failure.
const FETCH_TIMEOUT_MS = 12000;

// A handful of curated, meaningful groups instead of "active" (~10,000
// objects) — keeps this list genuinely varied (crewed stations, GPS
// constellation, weather satellites) without being huge.
const GROUPS = ["stations", "gps-ops", "weather"];

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
}

function parseTle(text: string): Tle[] {
  const lines = text.split("\n").map((l) => l.trimEnd());
  const tles: Tle[] = [];

  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i].trim();
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];
    if (name && line1?.startsWith("1 ") && line2?.startsWith("2 ")) {
      tles.push({ name, line1, line2 });
    }
  }

  return tles;
}

async function fetchGroup(group: string): Promise<Tle[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    // Connection: close — without it, Node/undici's keep-alive socket can
    // leave the build-time static-generation step hanging indefinitely
    // even after every fetch has resolved.
    const res = await fetch(`${CELESTRAK_URL}?GROUP=${group}&FORMAT=tle`, {
      signal: controller.signal,
      headers: LAYER_FETCH_HEADERS,
    });
    if (!res.ok) {
      console.error(`CelesTrak group "${group}" responded ${res.status} ${res.statusText}`);
      return [];
    }
    return parseTle(await res.text());
  } catch (err) {
    console.error(`Failed to fetch CelesTrak group "${group}":`, err);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetches TLEs and propagates each one to a current lat/lon/altitude —
 * entirely server-side. satellite.js is deliberately never imported by a
 * client component: shipping it to the browser bundle has twice caused
 * real problems (v7's WASM build hangs Turbopack's production build
 * indefinitely; v6's pure-JS build gets corrupted by the client minifier
 * into a syntax error at runtime — "Octal escape sequences are not
 * allowed"). Computing positions here means the client only ever
 * receives plain numbers. The trade-off is that positions are a snapshot
 * as of page render (refreshed on the existing hourly ISR revalidation)
 * rather than continuously live — an acceptable one given orbital
 * periods are 90 minutes to a day, not seconds.
 */
export async function fetchSatellitePositions(): Promise<SatellitePosition[]> {
  const groups = await Promise.all(GROUPS.map(fetchGroup));
  const byName = new Map<string, Tle>();
  for (const tle of groups.flat()) {
    byName.set(tle.name, tle);
  }

  const now = new Date();
  const gmst = satellite.gstime(now);
  const positions: SatellitePosition[] = [];

  for (const tle of byName.values()) {
    try {
      const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
      const positionAndVelocity = satellite.propagate(satrec, now);
      const eci = positionAndVelocity?.position;
      if (!eci || typeof eci === "boolean") continue;

      const geo = satellite.eciToGeodetic(eci, gmst);
      positions.push({
        name: tle.name,
        lat: satellite.degreesLat(geo.latitude),
        lon: satellite.degreesLong(geo.longitude),
        altitudeMeters: geo.height * 1000,
      });
    } catch {
      // Malformed or decayed TLE — skip it, not fatal for the rest.
    }
  }

  return positions;
}
