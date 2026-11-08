import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { simplifyRing, type Position } from "../lib/simplifyRing";

const area = (ring: Position[]) => {
  let sum = 0;
  for (let i = 0; i + 1 < ring.length; i++) sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return Math.abs(sum / 2);
};

/** Segments qui se croisent (hors voisins immédiats) : un contour valide n'en a aucun. */
function selfIntersections(ring: Position[]): number {
  const cross = (o: Position, a: Position, b: Position) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  let count = 0;
  for (let i = 0; i + 1 < ring.length; i++) {
    for (let j = i + 2; j + 1 < ring.length; j++) {
      if (i === 0 && j + 1 === ring.length - 1) continue;
      const [a, b, c, d] = [ring[i], ring[i + 1], ring[j], ring[j + 1]];
      if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) count++;
    }
  }
  return count;
}

test("un contour déjà assez court n'est pas touché", () => {
  const square: Position[] = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
  assert.equal(simplifyRing(square, 10), square);
});

test("un cercle de 400 sommets est ramené au maximum demandé, sans perdre sa forme", () => {
  const circle: Position[] = Array.from({ length: 400 }, (_, i) => [Math.cos((i / 400) * 2 * Math.PI) * 10, Math.sin((i / 400) * 2 * Math.PI) * 10]);
  circle.push(circle[0]);
  const lighter = simplifyRing(circle, 100);
  assert.ok(lighter.length <= 100 && lighter.length > 80, `${lighter.length} sommets`);
  assert.deepEqual(lighter[0], lighter[lighter.length - 1], "toujours fermé");
  assert.ok(Math.abs(area(lighter) - area(circle)) / area(circle) < 0.01, "surface à moins de 1 %");
});

test("les sommets fixes (ligne de changement de date) sont toujours gardés", () => {
  const ring: Position[] = [[170, 0]];
  for (let i = 1; i <= 200; i++) ring.push([170 + (i / 200) * 10, Math.sin(i / 5) * 0.001]);
  ring.push([180, 5], [180, 6], [170, 6], [170, 0]);
  const lighter = simplifyRing(ring, 20, (p) => p[0] >= 180);
  assert.ok(lighter.length <= 20);
  assert.ok(lighter.some((p) => p[0] === 180 && p[1] === 5) && lighter.some((p) => p[0] === 180 && p[1] === 6));
});

test("la Russie reste en un seul grand polygone sous la limite du globe, fidèle à l'original", () => {
  const world = JSON.parse(fs.readFileSync("public/data/world-countries.geo.json", "utf8")) as {
    features: { id: string; geometry: { type: string; coordinates: Position[][][] | Position[][] } }[];
  };
  const tooBig: string[] = [];
  for (const feature of world.features) {
    const polygons = (feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates) as Position[][][];
    for (const polygon of polygons) {
      if (polygon.reduce((sum, ring) => sum + ring.length, 0) > 300) tooBig.push(feature.id);
    }
  }
  // Seul l'Antarctique reste retiré du globe ; la Russie y est de nouveau, en un seul morceau.
  assert.deepEqual(tooBig, ["ATA"]);

  const russia = world.features.find((f) => f.id === "RUS");
  assert.ok(russia);
  const polygons = russia.geometry.coordinates as Position[][][];
  const main = polygons.reduce((best, polygon) => (polygon[0].length > best[0].length ? polygon : best));
  assert.ok(main[0].length > 200 && main[0].length <= 300, `${main[0].length} sommets`);
  assert.equal(selfIntersections(main[0]), 0, "le contour ne se recoupe pas");
  assert.ok(main[0].some((p) => p[0] === 180), "le bord posé sur la ligne de changement de date est resté");
  // Surface (en degrés carrés) de l'original à 447 sommets : 2 836,07. L'allègement l'a laissée à 0,06 % près (écart maximal du tracé : 31 km).
  assert.ok(Math.abs(area(main[0]) - 2836.07) / 2836.07 < 0.005, `surface ${area(main[0]).toFixed(1)}`);
});
