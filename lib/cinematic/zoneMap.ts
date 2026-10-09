// Carte des zones du globe : une image où chaque pays d'une zone porte un code de zone
// (sert à la fois à colorer le globe et à savoir quelle zone se trouve sous le pointeur),
// et une image des frontières de ces pays. Dessinées une fois, dans le navigateur, d'après
// les contours des pays déjà présents dans public/data.
import { ZONE_COUNTRIES } from "./zoneCountries";

/** Ordre des zones : l'indice + 1 est le code écrit dans l'image (0 = hors zone). */
export const ZONE_ORDER = ["europe", "moyen-orient", "afrique", "indopacifique", "amerique-du-sud"] as const;
export type ZoneSlug = (typeof ZONE_ORDER)[number];

export const ZONE_LABELS: Record<ZoneSlug, string> = {
  europe: "Europe",
  "moyen-orient": "Moyen-Orient",
  afrique: "Afrique",
  indopacifique: "Indopacifique",
  "amerique-du-sud": "Amérique du Sud",
};

/** Écart entre deux codes dans l'image : les bords lissés (valeurs intermédiaires) restent reconnaissables. */
export const ZONE_CODE_STEP = 40;

type Ring = number[][];
interface CountryFeature {
  id: string;
  geometry: { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] };
}

export interface ZoneMaps {
  /** Image des codes de zone (aplats, sans dégradé). */
  idCanvas: HTMLCanvasElement;
  /** Frontières des pays de zone (transparence ailleurs). */
  borderCanvas: HTMLCanvasElement;
  /** Code de zone de chaque pixel de `idCanvas`, pour retrouver la zone sous le pointeur. */
  ids: Uint8Array;
  width: number;
  height: number;
}

const zoneIndexByIso3 = new Map<string, number>(
  ZONE_ORDER.flatMap((zone, index) => ZONE_COUNTRIES[zone].map((c) => [c.iso3, index + 1] as const)),
);

function tracePolygons(ctx: CanvasRenderingContext2D, feature: CountryFeature, width: number, height: number) {
  const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  ctx.beginPath();
  for (const polygon of polygons) {
    for (const ring of polygon) {
      ring.forEach(([lon, lat], i) => {
        const x = ((lon + 180) / 360) * width;
        const y = ((90 - lat) / 180) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
    }
  }
}

export function paintZoneMaps(features: CountryFeature[], width: number, height: number, borderScale: number): ZoneMaps {
  const idCanvas = document.createElement("canvas");
  idCanvas.width = width;
  idCanvas.height = height;
  const idCtx = idCanvas.getContext("2d", { willReadFrequently: true });

  const borderCanvas = document.createElement("canvas");
  borderCanvas.width = width * borderScale;
  borderCanvas.height = height * borderScale;
  const borderCtx = borderCanvas.getContext("2d");
  if (!idCtx || !borderCtx) throw new Error("Canvas indisponible");

  idCtx.fillStyle = "#000";
  idCtx.fillRect(0, 0, width, height);
  borderCtx.strokeStyle = "#fff";
  borderCtx.lineJoin = "round";
  borderCtx.lineWidth = Math.max(1.2, width * borderScale * 0.0006);

  for (const feature of features) {
    const index = zoneIndexByIso3.get(feature.id);
    if (!index) continue;
    const value = index * ZONE_CODE_STEP;
    const color = `rgb(${value},0,0)`;
    tracePolygons(idCtx, feature, width, height);
    idCtx.fillStyle = color;
    idCtx.strokeStyle = color;
    idCtx.lineWidth = 1.5;
    idCtx.fill("evenodd");
    // Même couleur en contour : comble les fines coutures entre pays voisins d'une même zone.
    idCtx.stroke();

    tracePolygons(borderCtx, feature, width * borderScale, height * borderScale);
    borderCtx.stroke();
  }

  const data = idCtx.getImageData(0, 0, width, height).data;
  const ids = new Uint8Array(width * height);
  for (let i = 0; i < ids.length; i++) {
    const f = data[i * 4] / ZONE_CODE_STEP;
    const code = Math.round(f);
    ids[i] = Math.abs(f - code) < 0.12 ? code : 0;
  }
  return { idCanvas, borderCanvas, ids, width, height };
}

/** Zone sous un point du globe donné en coordonnées de texture (u, v de 0 à 1, v vers le haut). */
export function zoneAt(maps: ZoneMaps, u: number, v: number): ZoneSlug | null {
  const x = Math.min(maps.width - 1, Math.max(0, Math.floor(((u % 1) + 1) % 1 * maps.width)));
  const y = Math.min(maps.height - 1, Math.max(0, Math.floor((1 - v) * maps.height)));
  const code = maps.ids[y * maps.width + x];
  return code > 0 ? ZONE_ORDER[code - 1] : null;
}

/** Cadrage de chaque zone : point à centrer (latitude, longitude) et distance de la caméra. */
export const ZONE_FOCUS: Record<ZoneSlug, { lat: number; lon: number; distance: number }> = {
  europe: { lat: 52, lon: 28, distance: 2.95 },
  "moyen-orient": { lat: 29, lon: 46, distance: 2.35 },
  afrique: { lat: 3, lon: 20, distance: 2.9 },
  indopacifique: { lat: 14, lon: 105, distance: 3.1 },
  "amerique-du-sud": { lat: -18, lon: -60, distance: 2.8 },
};
