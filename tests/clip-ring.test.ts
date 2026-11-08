import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { clipRingToBand, longitudeSpan, splitRingIntoBands, type Position } from "../lib/clipRing";

const area = (ring: Position[]) => {
  let sum = 0;
  for (let i = 0; i + 1 < ring.length; i++) sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return Math.abs(sum / 2);
};

test("un carré coupé en deux bandes : deux rectangles dont la surface fait celle du carré", () => {
  const square: Position[] = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
  const left = clipRingToBand(square, 0, 4) as Position[];
  const right = clipRingToBand(square, 4, 10) as Position[];
  assert.equal(area(left), 40);
  assert.equal(area(right), 60);
  assert.deepEqual(left[0], left[left.length - 1], "contour fermé");
});

test("une bande qui ne touche pas le contour ne donne rien", () => {
  const square: Position[] = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
  assert.equal(clipRingToBand(square, 20, 30), null);
});

test("un contour de forme concave est fendu sans perdre de surface", () => {
  // En « U » ouvert vers le haut : la bande du milieu ne contient que le fond.
  const u: Position[] = [[0, 0], [9, 0], [9, 9], [6, 9], [6, 3], [3, 3], [3, 9], [0, 9], [0, 0]];
  const pieces = splitRingIntoBands(u, 3);
  assert.equal(pieces.length, 3);
  const total = pieces.reduce((sum, piece) => sum + area(piece), 0);
  assert.ok(Math.abs(total - area(u)) < 1e-9, `${total} contre ${area(u)}`);
});

test("un contour assez étroit est rendu tel quel", () => {
  const ring: Position[] = [[0, 0], [10, 0], [10, 10], [0, 0]];
  assert.deepEqual(splitRingIntoBands(ring, 40), [ring]);
});

test("fond de carte : la Russie est fendue en bandes sous la limite du globe, sans perdre un kilomètre carré", () => {
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
  // Seul l'Antarctique reste retiré du globe : la Russie n'a plus de contour de plus de 300 sommets.
  assert.deepEqual(tooBig, ["ATA"]);

  const russia = world.features.find((f) => f.id === "RUS");
  assert.ok(russia);
  const polygons = russia.geometry.coordinates as Position[][][];
  const bands = polygons.filter((polygon) => polygon[0].length > 60);
  assert.ok(bands.length >= 4, `${bands.length} grands morceaux`);
  // Le morceau d'origine faisait 2 836,07 degrés carrés (447 sommets) ; les bandes en recomposent la surface, et chacune reste étroite.
  const bigBands = bands.filter((polygon) => longitudeSpan(polygon[0]).max - longitudeSpan(polygon[0]).min > 20);
  const total = bigBands.reduce((sum, polygon) => sum + area(polygon[0]), 0);
  assert.ok(Math.abs(total - 2836.07) / 2836.07 < 1e-4, `surface ${total.toFixed(2)}`);
  for (const polygon of bigBands) {
    const { min, max } = longitudeSpan(polygon[0]);
    assert.ok(max - min <= 40.001, `bande de ${(max - min).toFixed(1)}°`);
  }
  assert.ok(bigBands.some((polygon) => longitudeSpan(polygon[0]).max === 180), "le bord posé sur la ligne de changement de date est resté");
});
