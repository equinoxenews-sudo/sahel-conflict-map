import assert from "node:assert/strict";
import test from "node:test";
import { applyGraphSlice, pushLimited, sameGraph, sameItems, sliceOf } from "../lib/investigation/graphHistory";
import { emptyInvestigationData, type InvestigationData } from "../lib/investigation/types";

const entity = (id: string, dossierId: string) =>
  ({ id, dossierId, type: "person", name: id, aliases: [], notes: "", position: { x: 0, y: 0 } }) as unknown as InvestigationData["entities"][number];
const relation = (id: string, dossierId: string, a: string, b: string) =>
  ({ id, dossierId, sourceEntityId: a, targetEntityId: b, type: "knows" }) as unknown as InvestigationData["relations"][number];
const note = (id: string, dossierId: string, entityId?: string) =>
  ({ id, dossierId, title: id, body: "", entityId }) as unknown as InvestigationData["notes"][number];

function data(): InvestigationData {
  return {
    ...emptyInvestigationData(),
    entities: [entity("a", "d1"), entity("b", "d1"), entity("x", "d2")],
    relations: [relation("r1", "d1", "a", "b")],
    notes: [note("n1", "d1", "a"), note("n2", "d2", "x")],
  };
}

test("revenir en arrière après la suppression d'une fiche rend la fiche, ses relations et son lien avec la note", () => {
  const before = data();
  const snapshot = sliceOf(
    before.entities.filter((e) => e.dossierId === "d1"),
    before.relations,
    [],
    before.notes.filter((n) => n.dossierId === "d1")
  );
  // suppression de « a » comme le fait le stockage
  const after: InvestigationData = {
    ...before,
    entities: before.entities.filter((e) => e.id !== "a"),
    relations: [],
    notes: before.notes.map((n) => ({ ...n, entityId: n.entityId === "a" ? undefined : n.entityId })),
  };
  const restored = applyGraphSlice(after, "d1", snapshot);
  assert.deepEqual(restored.entities.map((e) => e.id).sort(), ["a", "b", "x"]);
  assert.equal(restored.relations.length, 1);
  assert.equal(restored.notes.find((n) => n.id === "n1")?.entityId, "a");
});

test("un retour en arrière ne touche ni aux autres dossiers ni au texte des notes", () => {
  const before = data();
  const snapshot = sliceOf(before.entities.filter((e) => e.dossierId === "d1"), before.relations, [], []);
  const edited: InvestigationData = {
    ...before,
    entities: [...before.entities, entity("c", "d1")],
    notes: before.notes.map((n) => (n.id === "n1" ? { ...n, body: "texte écrit depuis" } : n)),
  };
  const restored = applyGraphSlice(edited, "d1", snapshot);
  assert.ok(!restored.entities.some((e) => e.id === "c"));
  assert.ok(restored.entities.some((e) => e.id === "x"));
  assert.equal(restored.notes.find((n) => n.id === "n1")?.body, "texte écrit depuis");
});

test("une note créée sur une fiche ensuite annulée devient une note libre", () => {
  const before = data();
  const snapshot = sliceOf(before.entities.filter((e) => e.dossierId === "d1"), before.relations, [], []);
  const edited: InvestigationData = {
    ...before,
    entities: [...before.entities, entity("c", "d1")],
    notes: [...before.notes, note("n3", "d1", "c")],
  };
  const restored = applyGraphSlice(edited, "d1", snapshot);
  assert.equal(restored.notes.find((n) => n.id === "n3")?.entityId, undefined);
});

test("comparaison de listes et pile bornée", () => {
  const a = entity("a", "d1");
  assert.ok(sameItems([a], [a]));
  assert.ok(!sameItems([a], [{ ...a }]));
  assert.ok(sameGraph(sliceOf([a], [], [], []), sliceOf([a], [], [], [])));
  assert.deepEqual(pushLimited([1, 2, 3], 4, 3), [2, 3, 4]);
});
