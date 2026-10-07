import test from "node:test";
import assert from "node:assert/strict";
import { computeTreeLayout, type LayoutNode } from "../lib/investigation/autoLayout";

const node = (id: string, x = 0, y = 0, extra: Partial<LayoutNode> = {}): LayoutNode => ({ id, x, y, width: 300, height: 100, ...extra });

const overlap = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) < 300 && Math.abs(a.y - b.y) < 100;

test("Hiérarchie : le parent est au-dessus de ses enfants, qui sont côte à côte", () => {
  const nodes = [node("apn"), node("w"), node("pendjari"), node("isidore")];
  const positions = computeTreeLayout(
    nodes,
    [
      { parent: "apn", child: "w" },
      { parent: "apn", child: "pendjari" },
      { parent: "w", child: "isidore" },
    ],
    [],
    { direction: "TB" }
  );
  assert.ok(positions.apn.y < positions.w.y);
  assert.ok(positions.w.y < positions.isidore.y);
  assert.equal(positions.w.y, positions.pendjari.y);
  assert.notEqual(positions.w.x, positions.pendjari.x);
});

test("Mode horizontal : le parent est à gauche de ses enfants", () => {
  const positions = computeTreeLayout([node("a"), node("b")], [{ parent: "a", child: "b" }], [], { direction: "LR" });
  assert.ok(positions.a.x < positions.b.x);
});

test("Une fiche reliée seulement par un lien latéral se place à côté de sa voisine, sans la recouvrir", () => {
  const nodes = [node("a"), node("b"), node("c")];
  const positions = computeTreeLayout(nodes, [{ parent: "a", child: "b" }], [{ a: "b", b: "c" }], { direction: "TB" });
  assert.equal(positions.c.y, positions.b.y);
  assert.ok(positions.c.x > positions.b.x);
  assert.equal(overlap(positions.b, positions.c), false);
});

test("Les fiches isolées sont rangées sous l'arbre, sans chevauchement", () => {
  const nodes = [node("a"), node("b"), node("x1"), node("x2"), node("x3")];
  const positions = computeTreeLayout(nodes, [{ parent: "a", child: "b" }], [], { direction: "TB" });
  for (const id of ["x1", "x2", "x3"]) assert.ok(positions[id].y > positions.b.y);
  const ids = Object.keys(positions);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) assert.equal(overlap(positions[ids[i]], positions[ids[j]]), false, `${ids[i]} / ${ids[j]}`);
  }
});

test("Une fiche épinglée garde sa position exacte, et l'ensemble garde son angle haut-gauche", () => {
  const nodes = [node("a", 500, 300), node("b", 900, 700, { pinned: true }), node("c", 640, 420)];
  const positions = computeTreeLayout(nodes, [{ parent: "a", child: "c" }], [], { direction: "TB" });
  assert.deepEqual(positions.b, { x: 900, y: 700 });
  assert.equal(Math.min(positions.a.x, positions.c.x), 500);
  assert.equal(Math.min(positions.a.y, positions.c.y), 300);
});

test("Un cycle de hiérarchie ne bloque pas la mise en page", () => {
  const positions = computeTreeLayout([node("a"), node("b")], [{ parent: "a", child: "b" }, { parent: "b", child: "a" }], [], { direction: "TB" });
  assert.ok(Number.isFinite(positions.a.x) && Number.isFinite(positions.b.y));
});

test("Sans fiche ni lien : rien ne casse", () => {
  assert.deepEqual(computeTreeLayout([], [], [], { direction: "TB" }), {});
});
