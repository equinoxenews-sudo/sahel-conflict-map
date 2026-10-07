import test from "node:test";
import assert from "node:assert/strict";
import { exportFrame } from "../lib/investigation/exportImage";

test("Cadre d'export : englobe toutes les fiches avec une marge", () => {
  const frame = exportFrame(
    [
      { x: 100, y: 50, width: 300, height: 100 },
      { x: 700, y: 400, width: 300, height: 200 },
    ],
    60,
    2
  );
  assert.ok(frame);
  assert.equal(frame.minX, 40);
  assert.equal(frame.minY, -10);
  assert.equal(frame.width, 1000 + 60 - 40);
  assert.equal(frame.height, 600 + 60 + 10);
  assert.equal(frame.pixelRatio, 2);
});

test("Un très grand graphe réduit la netteté pour tenir dans un canevas", () => {
  const frame = exportFrame([{ x: 0, y: 0, width: 20000, height: 400 }], 0, 2);
  assert.ok(frame);
  assert.ok(frame.pixelRatio < 1);
  assert.ok(frame.width * frame.pixelRatio <= 7000.5);
});

test("Rien à exporter si le graphe est vide", () => {
  assert.equal(exportFrame([]), null);
});
