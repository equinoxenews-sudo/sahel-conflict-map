// Supervision V1, Lot 3 : géométrie de la carte du tableau de bord. Module pur, testé.
// Le fond de carte est le contour du ou des pays de la Supervision (public/data/world-countries.geo.json), dessiné en SVG.
// Projection équirectangulaire corrigée de la latitude moyenne : suffisante à l'échelle d'un pays, sans dépendance.

export type Ring = [number, number][]; // [longitude, latitude]

export interface Area {
  rings: Ring[];
  /** Cadre [ouest, sud, est, nord]. */
  bbox: [number, number, number, number];
}

/** Données réelles : fond de carte et fraîcheur, communs à tous les modules d'un tableau. */
export interface DataContext {
  area: Area | null;
  /** Date (ISO) du fait le plus récent retrouvé, ou null. */
  latest: string | null;
  /** Nombre d'éléments du périmètre sur toute la période chargée (avant filtres), pour distinguer « rien » de « rien avec ces filtres ». */
  total: number;
}

interface GeoFeature {
  id?: string;
  geometry?: { type: string; coordinates: unknown } | null;
}

const MAX_POINTS_PER_RING = 220;

function decimate(ring: Ring): Ring {
  if (ring.length <= MAX_POINTS_PER_RING) return ring;
  const step = Math.ceil(ring.length / MAX_POINTS_PER_RING);
  const out = ring.filter((_, index) => index % step === 0);
  const last = ring[ring.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

function polygonsOf(geometry: GeoFeature["geometry"]): Ring[] {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return (geometry.coordinates as Ring[]).slice(0, 1); // anneau extérieur seulement
  if (geometry.type === "MultiPolygon") return (geometry.coordinates as Ring[][]).map((polygon) => polygon[0]);
  return [];
}

/** Contour des pays demandés. Les anneaux sont allégés (au plus ~220 points) : ils ne servent qu'à situer les événements. */
export function extractArea(geojson: { features?: GeoFeature[] }, iso3Codes: readonly string[]): Area | null {
  const rings: Ring[] = [];
  for (const feature of geojson.features ?? []) {
    if (feature.id && iso3Codes.includes(feature.id)) rings.push(...polygonsOf(feature.geometry).filter((ring) => Array.isArray(ring) && ring.length >= 4).map(decimate));
  }
  if (rings.length === 0) return null;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const ring of rings) {
    for (const [lon, lat] of ring) {
      west = Math.min(west, lon);
      east = Math.max(east, lon);
      south = Math.min(south, lat);
      north = Math.max(north, lat);
    }
  }
  return { rings, bbox: [west, south, east, north] };
}

export interface Projection {
  width: number;
  height: number;
  project: (lon: number, lat: number) => { x: number; y: number };
  /** Vrai si le point tombe dans le cadre (avec une marge). */
  inside: (lon: number, lat: number) => boolean;
}

/** Cadre l'aire dans une boîte de largeur 100 ; la hauteur suit les proportions réelles (bornée pour rester lisible). */
export function fitProjection(area: Area, margin = 0.06): Projection {
  const [w0, s0, e0, n0] = area.bbox;
  const lonSpan = Math.max(0.5, e0 - w0);
  const latSpan = Math.max(0.5, n0 - s0);
  const west = w0 - lonSpan * margin;
  const east = e0 + lonSpan * margin;
  const south = s0 - latSpan * margin;
  const north = n0 + latSpan * margin;
  const k = Math.cos((((s0 + n0) / 2) * Math.PI) / 180) || 1;
  const widthDeg = (east - west) * k;
  const heightDeg = north - south;
  const height = Math.min(220, Math.max(40, (100 * heightDeg) / widthDeg));
  const scale = 100 / widthDeg;
  return {
    width: 100,
    height,
    project: (lon, lat) => ({ x: (lon - west) * k * scale, y: (north - lat) * scale }),
    inside: (lon, lat) => lon >= west && lon <= east && lat >= south && lat <= north,
  };
}

export function ringsToPath(rings: readonly Ring[], projection: Projection): string {
  return rings
    .map((ring) =>
      ring
        .map(([lon, lat], index) => {
          const { x, y } = projection.project(lon, lat);
          return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join("") + "Z",
    )
    .join("");
}
