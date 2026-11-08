// Allège les contours de plus de 300 sommets du fond de carte du globe (public/data/world-countries.geo.json), pour que le grand morceau
// de la Russie reste en un seul polygone coloré et cliquable (Cesium plante sur les contours plus longs, voir Globe3D.tsx).
// L'Antarctique est laissé de côté : il garde son comportement actuel (retiré du globe).
// Relançable sans danger : un contour déjà court n'est pas touché.
//
//   npx tsx scripts/simplify-world-polygons.ts

import fs from "node:fs";
import path from "node:path";
import { simplifyRing, type Position } from "../lib/simplifyRing";

const FILE = path.join(process.cwd(), "public", "data", "world-countries.geo.json");
/** Seuil du globe (MAX_SAFE_VERTICES dans Globe3D.tsx) ; on vise un peu en dessous pour garder de la marge. */
const GLOBE_LIMIT = 300;
const TARGET = 280;
const SKIP = new Set(["ATA"]);
/** Sommets posés sur la ligne de changement de date : jamais déplacés, pour que le bord du polygone ne bouge pas. */
const onAntimeridian = (p: Position) => Math.abs(p[0]) >= 179.99;

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
  let touched = false;
  for (const polygon of polygons) {
    const size = polygon.reduce((sum, ring) => sum + ring.length, 0);
    if (size <= GLOBE_LIMIT) continue;
    polygon.forEach((ring, index) => {
      // Les trous gardent leurs sommets ; on allège seulement le contour extérieur, du nombre de sommets en trop.
      if (index !== 0) return;
      const holes = size - ring.length;
      const before = ring.length;
      polygon[index] = simplifyRing(ring, TARGET - holes, onAntimeridian);
      console.log(`${feature.id} : ${before} → ${polygon[index].length} sommets`);
    });
    touched = true;
  }
  if (!touched) return line;
  changed++;
  return JSON.stringify(feature) + (line.endsWith(",") ? "," : "");
});

if (changed > 0) fs.writeFileSync(FILE, out.join("\r\n"));
console.log(changed > 0 ? `${changed} pays allégé(s).` : "Rien à alléger.");
