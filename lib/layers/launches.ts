import { LAYER_FETCH_HEADERS } from "./fetchHeaders";

const LAUNCHES_URL = "https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=30";
const FETCH_TIMEOUT_MS = 8000;

export interface Launch {
  id: string;
  name: string;
  net: string | null;
  statusName: string | null;
  padName: string | null;
  lat: number;
  lon: number;
}

interface LaunchLibraryResult {
  id?: string;
  name?: string;
  net?: string;
  status?: { name?: string };
  pad?: { name?: string; location?: { latitude?: string | number; longitude?: string | number } };
}

/**
 * Upcoming rocket launches, free tier without a key for reasonable use.
 * Deliberately NOT using `mode=list` — that trimmed-down response mode
 * omits `pad.location`, which is the whole point here.
 */
export async function fetchUpcomingLaunches(): Promise<Launch[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    // Connection: close — without it, Node/undici's keep-alive socket can
    // leave the build-time static-generation step hanging indefinitely
    // even after every fetch has resolved.
    const res = await fetch(LAUNCHES_URL, {
      signal: controller.signal,
      headers: LAYER_FETCH_HEADERS,
    });
    if (!res.ok) {
      console.error(`Launch Library responded ${res.status} ${res.statusText}`);
      return [];
    }

    const data = (await res.json()) as { results?: LaunchLibraryResult[] };
    return (data.results ?? [])
      .map((r) => {
        const lat = Number(r.pad?.location?.latitude);
        const lon = Number(r.pad?.location?.longitude);
        if (!r.id || !r.name || Number.isNaN(lat) || Number.isNaN(lon)) return null;
        return {
          id: r.id,
          name: r.name,
          net: r.net ?? null,
          statusName: r.status?.name ?? null,
          padName: r.pad?.name ?? null,
          lat,
          lon,
        };
      })
      .filter((l): l is Launch => l !== null);
  } catch (err) {
    console.error("Failed to fetch upcoming launches:", err);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}
