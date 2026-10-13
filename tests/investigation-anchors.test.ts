import assert from "node:assert/strict";
import test from "node:test";
import { ANCHOR_IDS, autoAnchors, isAnchorId, isLineStyle, sideOf } from "../lib/investigation/anchors";

const card = (x: number, y: number) => ({ x, y, width: 260, height: 80 });

test("huit points d'ancrage, tous reconnus", () => {
  assert.equal(ANCHOR_IDS.length, 8);
  for (const anchor of ANCHOR_IDS) assert.equal(isAnchorId(anchor), true);
  assert.equal(isAnchorId("center"), false);
  assert.equal(isAnchorId(undefined), false);
});

test("formes de trait reconnues", () => {
  assert.equal(isLineStyle("straight"), true);
  assert.equal(isLineStyle("curve"), true);
  assert.equal(isLineStyle("elbow"), true);
  assert.equal(isLineStyle("zigzag"), false);
});

test("côté d'un point d'ancrage", () => {
  assert.equal(sideOf("tc"), "top");
  assert.equal(sideOf("bl"), "bottom");
  assert.equal(sideOf("ml"), "left");
  assert.equal(sideOf("mr"), "right");
});

test("auto : un parent au-dessus d'un enfant relie bas et haut", () => {
  assert.deepEqual(autoAnchors(card(300, 0), card(300, 200)), { source: "bc", target: "tc" });
});

test("auto : un enfant au-dessus de son parent relie haut et bas", () => {
  assert.deepEqual(autoAnchors(card(300, 200), card(300, 0)), { source: "tc", target: "bc" });
});

test("auto : deux fiches côte à côte relient droite et gauche", () => {
  assert.deepEqual(autoAnchors(card(0, 0), card(500, 10)), { source: "mr", target: "ml" });
  assert.deepEqual(autoAnchors(card(500, 10), card(0, 0)), { source: "ml", target: "mr" });
});

test("auto : l'écart se juge par rapport à la taille des cartes (cartes larges)", () => {
  // 300 px d'écart horizontal (1,15 largeur de carte) contre 60 px vertical (0,75 hauteur) : horizontal.
  assert.deepEqual(autoAnchors(card(0, 0), card(300, 60)), { source: "mr", target: "ml" });
});
