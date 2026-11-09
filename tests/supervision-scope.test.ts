import assert from "node:assert/strict";
import test from "node:test";
import { classifyScopeChange } from "../lib/supervision/core/majorChange";
import { DEFAULT_POLICY } from "../lib/supervision/core/policy";
import { OBJECTIVES, initialScope, validateCreateInput } from "../lib/supervision/core/scope";

test("création : un nom, un pays connu et un objectif connu suffisent ; tout est normalisé", () => {
  const result = validateCreateInput({ name: "  Nord   Bénin ", country: "ben", objective: "securite" });
  assert.ok(result.ok);
  if (result.ok) assert.deepEqual(result.value, { name: "Nord Bénin", country: "BEN", objective: "securite" });
});

test("création : nom trop court ou trop long, pays inconnu, objectif inconnu, corps absurde — tout est refusé avec un message", () => {
  for (const bad of [null, undefined, "x", [], {}, { name: "ab", country: "BEN", objective: "securite" }, { name: "a".repeat(81), country: "BEN", objective: "securite" }, { name: "Veille", country: "XXX", objective: "securite" }, { name: "Veille", country: "BEN", objective: "magie" }, { name: 42, country: 1, objective: {} }]) {
    const result = validateCreateInput(bad);
    assert.equal(result.ok, false, JSON.stringify(bad)?.slice(0, 50));
    if (!result.ok) assert.ok(result.errors.length > 0);
  }
});

test("périmètre initial : une zone principale (le pays), l'objectif choisi, estimation INCONNUE (donc signalée comme non fiable)", () => {
  const snapshot = initialScope({ name: "Nord Bénin", country: "BEN", objective: "securite" });
  assert.deepEqual(snapshot.scope.primaryZone, { kind: "countries", codes: ["BEN"] });
  assert.equal(snapshot.scope.objective, "securite");
  assert.equal(snapshot.estimate.volumeConfidence, "unknown");
  assert.equal(snapshot.estimate.costConfidence, "unknown");
  // Compatible avec la classification : passer du Bénin au Japon est un remplacement de zone, donc majeur.
  const japan = initialScope({ name: "Japon", country: "JPN", objective: "securite" });
  assert.ok(classifyScopeChange(snapshot, japan, DEFAULT_POLICY.majorChange).reasons.includes("zone_replaced"));
  assert.ok(OBJECTIVES.length >= 4);
});
