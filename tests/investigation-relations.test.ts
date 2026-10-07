import test from "node:test";
import assert from "node:assert/strict";
import {
  edgeLabel,
  hierarchyOf,
  phraseFrom,
  RELATION_TYPES,
  resolveRelationType,
} from "../lib/investigation/relationTypes";
import type { Relation } from "../lib/investigation/types";

const relation = (extra: Partial<Relation>): Relation => ({
  id: "r", dossierId: "d", sourceEntityId: "a", targetEntityId: "b", label: "", status: "documented",
  justifyingSourceId: null, confidence: 80, createdAt: "2026-10-07", ...extra,
});

test("Le catalogue est cohérent : clés uniques, deux lectures, symétrie sans lecture inverse distincte", () => {
  const keys = RELATION_TYPES.map((t) => t.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const type of RELATION_TYPES) {
    assert.ok(type.label && type.inverse, type.key);
    if (type.symmetric) assert.equal(type.label, type.inverse, type.key);
    else assert.notEqual(type.label, type.inverse, type.key);
  }
});

test("Une relation se lit dans les deux sens", () => {
  const r = relation({ typeKey: "leads", sourceEntityId: "isidore", targetEntityId: "apn" });
  assert.deepEqual(phraseFrom(r, "isidore"), { text: "dirige", otherId: "apn", outgoing: true });
  assert.deepEqual(phraseFrom(r, "apn"), { text: "est dirigé par", otherId: "isidore", outgoing: false });
  assert.equal(phraseFrom(r, "inconnu"), null);
});

test("Une relation symétrique se lit pareil des deux côtés", () => {
  const r = relation({ typeKey: "works_with" });
  assert.equal(phraseFrom(r, "a")?.text, "travaille avec");
  assert.equal(phraseFrom(r, "b")?.text, "travaille avec");
});

test("Un libellé libre reste affiché tel quel", () => {
  const r = relation({ label: "a rencontré en 2024" });
  assert.equal(edgeLabel(r), "a rencontré en 2024");
  assert.equal(phraseFrom(r, "b")?.text, "a rencontré en 2024");
  assert.equal(resolveRelationType(r), null);
});

test("Un ancien libellé qui reproduit le catalogue est reconnu, accents et casse ignorés", () => {
  assert.equal(resolveRelationType(relation({ label: "Travaille avec" }))?.type.key, "works_with");
  const reversed = resolveRelationType(relation({ label: "est dirigé par" }));
  assert.equal(reversed?.type.key, "leads");
  assert.equal(reversed?.reversed, true);
});

test("Hiérarchie : le parent est l'extrémité du dessus selon le type, et le sens inversé est respecté", () => {
  assert.deepEqual(hierarchyOf(relation({ typeKey: "subsidiary" })), { parent: "a", child: "b" });
  assert.deepEqual(hierarchyOf(relation({ typeKey: "leads" })), { parent: "b", child: "a" });
  assert.deepEqual(hierarchyOf(relation({ label: "est dirigé par" })), { parent: "a", child: "b" });
  assert.equal(hierarchyOf(relation({ typeKey: "works_with" })), null);
  assert.equal(hierarchyOf(relation({ label: "texte libre" })), null);
});
