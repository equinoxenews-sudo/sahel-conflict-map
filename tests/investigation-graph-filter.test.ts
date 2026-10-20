import assert from "node:assert/strict";
import test from "node:test";
import { SHAPES_FILTER, edgeHidden, entityHidden, filterRows, parseHidden, serializeHidden, toggleHidden } from "../lib/investigation/graphFilter";
import type { EntityType } from "../lib/investigation/types";

const ORDER: EntityType[] = ["person", "organization", "location", "building", "equipment", "event", "document", "account"];

test("décocher une catégorie la masque, la recocher la remet", () => {
  let hidden = new Set<ReturnType<typeof parseHidden> extends Set<infer K> ? K : never>();
  hidden = toggleHidden(hidden, "person");
  assert.ok(entityHidden(hidden, "person"));
  assert.ok(!entityHidden(hidden, "organization"));
  hidden = toggleHidden(hidden, "person");
  assert.ok(!entityHidden(hidden, "person"));
  assert.equal(hidden.size, 0);
});

test("un trait disparaît avec l'une de ses deux fiches, pas avant", () => {
  const types = new Map<string, EntityType>([
    ["a", "person"],
    ["b", "organization"],
    ["c", "person"],
  ]);
  const hidden = toggleHidden(new Set(), "person");
  assert.ok(edgeHidden(hidden, types, "a", "b"));
  assert.ok(edgeHidden(hidden, types, "b", "c"));
  assert.ok(edgeHidden(hidden, types, "a", "c"));
  assert.ok(!edgeHidden(toggleHidden(new Set(), "location"), types, "a", "b"));
});

test("les catégories présentes sont listées dans l'ordre, avec leur nombre et les formes en dernier", () => {
  const rows = filterRows(["organization", "person", "person", "event"], 3, ORDER);
  assert.deepEqual(rows, [
    { key: "person", count: 2 },
    { key: "organization", count: 1 },
    { key: "event", count: 1 },
    { key: SHAPES_FILTER, count: 3 },
  ]);
  assert.deepEqual(filterRows(["person"], 0, ORDER), [{ key: "person", count: 1 }]);
});

test("l'enregistrement se relit ; un contenu abîmé ou inconnu ne masque rien", () => {
  const hidden = toggleHidden(toggleHidden(new Set(), "person"), SHAPES_FILTER);
  assert.deepEqual([...parseHidden(serializeHidden(hidden))].sort(), ["person", "shapes"]);
  assert.equal(parseHidden(null).size, 0);
  assert.equal(parseHidden("pas du json").size, 0);
  assert.equal(parseHidden('{"a":1}').size, 0);
  assert.deepEqual([...parseHidden('["person","n_importe_quoi",3]')], ["person"]);
});
