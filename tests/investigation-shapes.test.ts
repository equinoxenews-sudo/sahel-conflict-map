import assert from "node:assert/strict";
import test from "node:test";
import { frontZ, newShape, reorderShape } from "../lib/investigation/shapes";
import type { GraphShape } from "../lib/investigation/types";

function shape(id: string, z: number): GraphShape {
  return {
    id,
    dossierId: "d",
    kind: "rect",
    position: { x: 0, y: 0 },
    width: 100,
    height: 60,
    z,
    createdAt: `2026-10-13T00:00:0${id.length}.000Z`,
  };
}

function applied(shapes: GraphShape[], changes: Record<string, number>): Record<string, number> {
  return Object.fromEntries(shapes.map((s) => [s.id, changes[s.id] ?? s.z]));
}

test("une nouvelle forme se place devant tout le reste", () => {
  assert.equal(frontZ([]), 1);
  assert.equal(frontZ([shape("a", 1), shape("b", 3), shape("c", -2)]), 4);
});

test("premier plan : la forme passe devant les autres", () => {
  const shapes = [shape("a", 1), shape("bb", 2), shape("ccc", 3)];
  const result = applied(shapes, reorderShape(shapes, "a", "front"));
  assert.ok(result.a > result.bb && result.a > result.ccc);
});

test("dernier plan : la forme passe derrière les fiches et les autres formes", () => {
  const shapes = [shape("a", 1), shape("bb", 2), shape("ccc", 3)];
  const result = applied(shapes, reorderShape(shapes, "ccc", "back"));
  assert.ok(result.ccc < 0);
  assert.ok(result.ccc < result.a && result.ccc < result.bb);
});

test("avancer : une seule marche au-dessus de la voisine", () => {
  const shapes = [shape("a", 1), shape("bb", 2), shape("ccc", 3)];
  const result = applied(shapes, reorderShape(shapes, "a", "forward"));
  assert.ok(result.a > result.bb);
  assert.ok(result.a < result.ccc);
});

test("reculer depuis la première couche devant les fiches : passe derrière les fiches", () => {
  const shapes = [shape("a", 1)];
  const result = applied(shapes, reorderShape(shapes, "a", "backward"));
  assert.ok(result.a < 0);
});

test("avancer depuis derrière les fiches : repasse devant les fiches", () => {
  const shapes = [shape("a", -1)];
  const result = applied(shapes, reorderShape(shapes, "a", "forward"));
  assert.ok(result.a > 0);
});

test("déjà au premier plan : rien ne change", () => {
  const shapes = [shape("a", 1), shape("bb", 2)];
  assert.deepEqual(reorderShape(shapes, "bb", "front"), {});
  assert.deepEqual(reorderShape(shapes, "bb", "forward"), {});
});

test("une forme inconnue ne change rien", () => {
  assert.deepEqual(reorderShape([shape("a", 1)], "zzz", "front"), {});
});

test("forme neuve : centrée, avec le style de son type", () => {
  const rect = newShape("rect", "d", { x: 500, y: 300 }, 4);
  assert.equal(rect.position.x, 500 - rect.width / 2);
  assert.equal(rect.z, 4);
  assert.ok(rect.fill && rect.stroke);
  const text = newShape("text", "d", { x: 0, y: 0 }, 1);
  assert.equal(text.fill, undefined);
  assert.equal(text.stroke, undefined);
  const arrow = newShape("arrow", "d", { x: 0, y: 0 }, 1);
  assert.equal(arrow.fill, undefined);
  assert.ok(arrow.stroke);
});
