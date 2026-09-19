const EARTHQUAKES_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";
const FETCH_TIMEOUT_MS = 8000;

export interface Earthquake {
  id: string;
  place: string | null;
  magnitude: number;
  time: number;
  lat: number;
  lon: number;
  depthKm: number | null;
}

interface UsgsFeature {
  id?: string;
  properties?: { mag?: number | null; place?: string | null; time?: number };
  geometry?: { coordinates?: [number, number, number] };
}

/**
 * M2.5+ earthquakes from the last day, no API key required. Chosen over
 * the "all day" feed (far noisier, mostly sub-2.5 events with little
 * visual significance on a world-scale globe) and over the "significant"
 * feed (too sparse — can be empty for days).
 */
export async function fetchEarthquakes(): Promise<Earthquake[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    // Connection: close — without it, Node/undici's keep-alive socket can
    // leave the build-time static-generation step hanging indefinitely
    // even after every fetch has resolved.
    const res = await fetch(EARTHQUAKES_URL, {
      signal: controller.signal,
      headers: { Connection: "close" },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as { features?: UsgsFeature[] };
    return (data.features ?? [])
      .filter(
        (f): f is UsgsFeature & { id: string; geometry: { coordinates: [number, number, number] } } =>
          typeof f.id === "string" && Array.isArray(f.geometry?.coordinates)
      )
      .map((f) => ({
        id: f.id,
        place: f.properties?.place ?? null,
        magnitude: f.properties?.mag ?? 0,
        time: f.properties?.time ?? 0,
        lon: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
        depthKm: f.geometry.coordinates[2] ?? null,
      }));
  } catch (err) {
    console.error("Failed to fetch earthquakes:", err);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}
