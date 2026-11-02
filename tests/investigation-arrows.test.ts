import assert from "node:assert/strict";
import test from "node:test";
import { DUPLICATE_RELATION_KEY, arrowEnd } from "../lib/investigation/relationTypes";

// Sens des relations sur le graphe : la flèche va du sujet vers l'objet de la phrase lue sur le trait.

test("« A utilise B » : la flèche pointe sur B (la cible)", () => {
  assert.equal(arrowEnd({ typeKey: "uses", labelInverse: undefined, directed: undefined }), "target");
});

test("lecture inverse (« B est utilisé par A ») : la flèche pointe sur A (la source), comme la phrase affichée", () => {
  assert.equal(arrowEnd({ typeKey: "uses", labelInverse: true, directed: undefined }), "source");
  assert.equal(arrowEnd({ typeKey: "leads", labelInverse: true, directed: undefined }), "source");
});

test("un libellé libre (sans type du catalogue) est lu de la source vers la cible : flèche sur la cible", () => {
  assert.equal(arrowEnd({ typeKey: undefined, labelInverse: undefined, directed: undefined }), "target");
});

test("aucune flèche pour une relation symétrique, un doublon possible, ou quand elle est désactivée", () => {
  assert.equal(arrowEnd({ typeKey: "works_with", labelInverse: undefined, directed: undefined }), null, "symétrique : « travaille avec »");
  assert.equal(arrowEnd({ typeKey: DUPLICATE_RELATION_KEY, labelInverse: undefined, directed: undefined }), null, "doublon possible");
  assert.equal(arrowEnd({ typeKey: "uses", labelInverse: undefined, directed: false }), null, "désactivée");
  assert.equal(arrowEnd({ typeKey: undefined, labelInverse: undefined, directed: false }), null, "libellé libre, désactivée");
});
