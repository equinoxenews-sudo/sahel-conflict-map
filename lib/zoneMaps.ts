import { SOUTH_AMERICA_COUNTRIES, SOUTH_AMERICA_VIEWBOX } from "./southAmericaMap";
import { REGION_MAPS, type ZoneMapData } from "./regionMaps";

const FEATURED_AMERIQUE_DU_SUD = ["BRA", "COL", "VEN", "GUY"];

export type { ZoneMapData };

// Single lookup point for the Approche page's country map, regardless of
// which generation pass produced the data (Amérique du Sud was the first,
// hand-verified one; the other zones were generated together later into
// regionMaps.ts) — callers don't need to know the difference.
export function getZoneMapData(zoneSlug: string): ZoneMapData | undefined {
  if (zoneSlug === "amerique-du-sud") {
    return {
      viewBox: SOUTH_AMERICA_VIEWBOX,
      countries: SOUTH_AMERICA_COUNTRIES,
      featured: FEATURED_AMERIQUE_DU_SUD,
      oceanLabels: [
        { lines: ["Océan", "Pacifique"], x: 40, y: 505 },
        { lines: ["Océan", "Atlantique"], x: 555, y: 505 },
      ],
    };
  }
  return REGION_MAPS[zoneSlug];
}
