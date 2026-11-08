// Fend en bandes de longitude les contours de plus de 300 sommets du fond de carte du globe (public/data/world-countries.geo.json) :
// Cesium ne sait pas dessiner d'un seul tenant le grand polygone de la Russie (voir lib/clipRing.ts et Globe3D.tsx).
// Le tracé d'origine est conservé tel quel ; les morceaux gardent le code pays de leur pays (RUS_10, RUS_11…).
// L'Antarctique est laissé de côté : il garde son comportement actuel (retiré du globe).
//
// À lancer sur le fichier d'origine ; sans effet sur un fichier déjà fendu (plus aucun contour de plus de 300 sommets).
//   npx tsx scripts/split-world-polygons.ts

import fs from "node:fs";
import path from "node:path";
import { splitRingIntoBands, type Position } from "../lib/clipRing";

const FILE = path.join(process.cwd(), "public", "data", "world-countries.geo.json");
/** Seuil du globe (MAX_SAFE_VERTICES dans Globe3D.tsx). */
const GLOBE_LIMIT = 300;
const BAND_DEGREES = 40;
const SKIP = new Set(["ATA"]);

interface Feature {
  id: string;
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: Position[][] | Position[][][] };
}

const lines = fs.readFileSync(FILE, "utf8").split("\r\n"); // le fichier est en fins de ligne Windows : on les garde telles quelles
let changed = 0;
const out = lines.map((line) => {
  const text = line.endsWith(",") ? line.slice(0, -1) : line;
  if (!text.startsWith('{"type":"Feature"')) return line;
  const feature = JSON.parse(text) as Feature;
  if (SKIP.has(feature.id)) return line;

  const polygons = (feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates) as Position[][][];
  const next: Position[][][] = [];
  let touched = false;
  for (const polygon of polygons) {
    const size = polygon.reduce((sum, ring) => sum + ring.length, 0);
    if (size <= GLOBE_LIMIT) {
      next.push(polygon);
      continue;
    }
    if (polygon.length > 1) throw new Error(`${feature.id} : contour trop grand avec des trous, à traiter à la main`);
    const pieces = splitRingIntoBands(polygon[0], BAND_DEGREES);
    console.log(`${feature.id} : ${size} sommets → ${pieces.length} morceaux de ${pieces.map((p) => p.length).join(", ")} sommets`);
    for (const piece of pieces) next.push([piece]);
    touched = true;
  }
  if (!touched) return line;
  changed++;
  feature.geometry = { type: "MultiPolygon", coordinates: next };
  return JSON.stringify(feature) + (line.endsWith(",") ? "," : "");
});

if (changed > 0) fs.writeFileSync(FILE, out.join("\r\n"));
console.log(changed > 0 ? `${changed} pays fendu(s).` : "Rien à fendre.");
