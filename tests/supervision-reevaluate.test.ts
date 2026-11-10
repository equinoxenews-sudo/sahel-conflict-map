import assert from "node:assert/strict";
import test from "node:test";
import { matchItem } from "../lib/supervision/collect/match";
import { reevaluate, type StoredMatch } from "../lib/supervision/collect/reevaluate";
import type { ScopeSnapshot } from "../lib/supervision/core/majorChange";
import { applyScopeEdit, editOf } from "../lib/supervision/core/scopeEdit";

const base: ScopeSnapshot = {
  scope: { primaryZone: { kind: "countries", codes: ["NGA"] }, objective: "securite", countries: ["NGA"], sources: [], keywords: [], entities: [] },
  estimate: { volumePerMonth: null, volumeConfidence: "unknown", aiCostUsdPerMonth: null, costConfidence: "unknown" },
};

/** Un rattachement tel qu'il serait rangé : on le fabrique avec le jugement du moment, comme le fait la collecte. */
function stored(itemId: string, title: string, snapshot: ScopeSnapshot, hiddenAt: string | null = null): StoredMatch {
  const verdict = matchItem({ title, excerpt: null }, snapshot);
  assert.ok(verdict.matched, `« ${title} » doit correspondre au périmètre de départ`);
  return { item_id: itemId, score: verdict.score, reason: verdict.reason, terms: verdict.terms, theme: verdict.theme, hidden_at: hiddenAt, title, excerpt: null };
}

const CONVOY = "Nigeria : attaque contre un convoi militaire";
const FOOTBALL = "Nigeria : attaque contre un stade de football";
const PIPELINE = "Nigeria : un pipeline visé, des enlèvements signalés";

test("rien n'a changé : aucune action (la ré-évaluation est idempotente)", () => {
  const rows = [stored("a", CONVOY, base), stored("b", FOOTBALL, base)];
  assert.deepEqual(reevaluate(rows, base), { hide: [], restore: [], refresh: [] });
});

test("une exclusion ajoutée masque les anciennes publications concernées, avec la raison écrite, et laisse les autres", () => {
  const rows = [stored("a", CONVOY, base), stored("b", FOOTBALL, base)];
  const next = applyScopeEdit(base, { ...editOf(base), exclusions: ["football"] });
  const plan = reevaluate(rows, next);
  assert.deepEqual(plan.hide.map((entry) => entry.itemId), ["b"]);
  assert.match(plan.hide[0].reason, /^Exclu : « football »/);
  assert.deepEqual([plan.restore, plan.refresh], [[], []]);
});

test("la règle est assouplie : une publication masquée est rétablie, avec son nouveau jugement", () => {
  const withExclusion = applyScopeEdit(base, { ...editOf(base), exclusions: ["football"] });
  const row = { ...stored("b", FOOTBALL, base), hidden_at: "2026-11-10T10:00:00Z" };
  const plan = reevaluate([row], base);
  assert.deepEqual(plan.restore.map((entry) => entry.itemId), ["b"]);
  assert.equal(plan.restore[0].fields.reason, row.reason);
  // Toujours exclue : déjà masquée, rien à faire (on ne la masque pas deux fois).
  assert.deepEqual(reevaluate([row], withExclusion), { hide: [], restore: [], refresh: [] });
});

test("des mots-clés remplacent le vocabulaire par défaut : ce qui ne les cite pas est masqué, ce qui les cite est mis à jour", () => {
  const rows = [stored("a", CONVOY, base), stored("p", PIPELINE, base)];
  const next = applyScopeEdit(base, { ...editOf(base), keywords: ["pipeline"] });
  const plan = reevaluate(rows, next);
  assert.deepEqual(plan.hide.map((entry) => entry.itemId), ["a"], "le convoi ne cite pas « pipeline »");
  assert.deepEqual(plan.refresh.map((entry) => entry.itemId), ["p"], "le pipeline reste, avec une raison et un score recalculés");
  assert.deepEqual(plan.refresh[0].fields.terms, ["pipeline"]);
  assert.equal(plan.refresh[0].fields.score, 2);
});

test("un autre pays dans le périmètre : les publications qui ne citent plus aucun pays de la zone sont masquées", () => {
  const rows = [stored("a", CONVOY, base)];
  const mali = applyScopeEdit(base, { ...editOf(base), countries: ["MLI"] });
  const plan = reevaluate(rows, mali);
  assert.deepEqual(plan.hide, [{ itemId: "a", reason: "Ne cite aucun pays de la zone" }]);
});

test("déterministe : même entrée, même plan", () => {
  const rows = [stored("a", CONVOY, base), stored("b", FOOTBALL, base), stored("p", PIPELINE, base)];
  const next = applyScopeEdit(base, { ...editOf(base), keywords: ["pipeline"], exclusions: ["football"] });
  assert.deepEqual(reevaluate(rows, next), reevaluate(rows, next));
});
