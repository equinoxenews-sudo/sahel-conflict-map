import assert from "node:assert/strict";
import test from "node:test";
import { edgeLabel } from "../lib/investigation/relationTypes";

test("Le trait affiche la lecture directe par défaut, l'inverse si elle a été choisie", () => {
  assert.equal(edgeLabel({ typeKey: "leads", label: "dirige" }), "dirige");
  assert.equal(edgeLabel({ typeKey: "leads", label: "dirige", labelInverse: true }), "est dirigé par");
});

test("Une relation symétrique ou libre ne change pas de libellé", () => {
  assert.equal(edgeLabel({ typeKey: "works_with", label: "travaille avec", labelInverse: true }), "travaille avec");
  assert.equal(edgeLabel({ typeKey: undefined, label: "a rencontré", labelInverse: true }), "a rencontré");
});
