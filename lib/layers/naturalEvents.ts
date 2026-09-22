import { LAYER_FETCH_HEADERS } from "./fetchHeaders";

const EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events";
const FETCH_TIMEOUT_MS = 8000;

export type NaturalEventCategory = "wildfires" | "severeStorms" | "volcanoes" | "floods";

const CATEGORIES: NaturalEventCategory[] = ["wildfires", "severeStorms", "volcanoes", "floods"];

export interface NaturalEvent {
  id: string;
  title: string;
  category: NaturalEventCategory;
  lat: number;
  lon: number;
  date: string | null;
}

interface EonetGeometry {
  date?: string;
  coordinates?: [number, number];
}

interface EonetEvent {
  id?: string;
  title?: string;
  categories?: { id?: string }[];
  geometry?: EonetGeometry[];
}

function isKnownCategory(id: string | undefined): id is NaturalEventCategory {
  return !!id && (CATEGORIES as string[]).includes(id);
}

/**
 * Wildfires, severe storms, volcanoes and floods in one call — EONET
 * lets a single request filter to exactly these 4 categories, so all 4
 * checkbox layers share one fetch (split by category at render time).
 * No API key required. A storm's geometry can carry several points over
 * its lifetime (it moves); the most recent one is what's worth plotting.
 */
export async function fetchNaturalEvents(): Promise<NaturalEvent[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = `${EONET_URL}?status=open&category=${CATEGORIES.join(",")}`;
    // Connection: close — without it, Node/undici's keep-alive socket can
    // leave the build-time static-generation step hanging indefinitely
    // even after every fetch has resolved.
    const res = await fetch(url, { signal: controller.signal, headers: LAYER_FETCH_HEADERS });
    if (!res.ok) {
      console.error(`EONET responded ${res.status} ${res.statusText}`);
      return [];
    }

    const data = (await res.json()) as { events?: EonetEvent[] };
    const events: NaturalEvent[] = [];

    for (const event of data.events ?? []) {
      const categoryId = event.categories?.[0]?.id;
      if (!isKnownCategory(categoryId)) continue;
      if (!event.id || !event.title) continue;

      const latestGeometry = event.geometry?.at(-1);
      const coords = latestGeometry?.coordinates;
      if (!coords) continue;

      events.push({
        id: event.id,
        title: event.title,
        category: categoryId,
        lon: coords[0],
        lat: coords[1],
        date: latestGeometry.date ?? null,
      });
    }

    return events;
  } catch (err) {
    console.error("Failed to fetch EONET natural events:", err);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}
