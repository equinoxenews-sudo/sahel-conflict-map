import { readFileSync } from "node:fs";
import path from "node:path";
import type { Feature, MultiPolygon, Polygon } from "geojson";

// Server-only (uses node:fs) — never import this from a Client Component.
// Reads the same world GeoJSON already shipped as a public static asset
// for the Cesium globe (public/data/world-countries.geo.json), so country
// profile maps render real polygon borders instead of a hand-projected
// SVG approximation.

export type WorldGeoFeature = Feature<Polygon | MultiPolygon, { name?: string }> & { id: string };

let cache: Map<string, WorldGeoFeature> | null = null;

function load(): Map<string, WorldGeoFeature> {
  if (cache) return cache;
  const filePath = path.join(process.cwd(), "public", "data", "world-countries.geo.json");
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as { features: WorldGeoFeature[] };
  cache = new Map(raw.features.map((f) => [f.id, f]));
  return cache;
}

export function getWorldCountryFeature(iso3: string): WorldGeoFeature | undefined {
  return load().get(iso3);
}
