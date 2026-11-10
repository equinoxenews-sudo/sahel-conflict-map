import assert from "node:assert/strict";
import test from "node:test";
import { isAuthorizedCron } from "../lib/cronAuth";
import { SCHEDULED_MIN_INTERVAL_MINUTES, collectingStates, orderByStaleness, type Candidate } from "../lib/supervision/collect/schedule";

const c = (id: string, lastCollectedAt: string | null): Candidate => ({ id, ownerId: "o", lastCollectedAt });

test("ordre de passage : les Supervisions jamais collectées d'abord, puis les moins récemment collectées", () => {
  const ordered = orderByStaleness([c("recent", "2026-11-10T11:00:00Z"), c("jamais-b", null), c("ancienne", "2026-11-08T06:00:00Z"), c("jamais-a", null), c("milieu", "2026-11-10T01:00:00Z")]);
  assert.deepEqual(ordered.map((entry) => entry.id), ["jamais-a", "jamais-b", "ancienne", "milieu", "recent"]);
});

test("ordre de passage : déterministe, et la liste d'origine n'est pas modifiée", () => {
  const input = [c("b", "2026-11-10T01:00:00Z"), c("a", "2026-11-10T01:00:00Z")];
  const copy = [...input];
  assert.deepEqual(orderByStaleness(input).map((entry) => entry.id), ["a", "b"], "à égalité, l'identifiant départage");
  assert.deepEqual(input, copy);
  assert.deepEqual(orderByStaleness([]), []);
});

test("états qui collectent : seulement l'initialisation et l'activité (brouillon, pause, erreur, lecture seule, suppression : non)", () => {
  assert.deepEqual([...collectingStates()].sort(), ["active", "initializing"]);
});

test("écart minimal programmé : 3 heures, donc compatible avec trois passages par jour malgré la dérive de ±59 minutes de Vercel (Hobby)", () => {
  assert.equal(SCHEDULED_MIN_INTERVAL_MINUTES, 180);
  // Trois entrées à 6 h, 12 h et 18 h : l'écart le plus court possible est 6 h − 2 × 59 min ≈ 4 h 02 > 3 h : aucun passage n'est refusé à tort.
  assert.ok(6 * 60 - 2 * 59 > SCHEDULED_MIN_INTERVAL_MINUTES);
});

test("la route programmée est refusée sans secret, ou avec un mauvais secret (même garde que les autres tâches planifiées)", () => {
  assert.equal(isAuthorizedCron(null, "secret"), false);
  assert.equal(isAuthorizedCron("Bearer autre", "secret"), false);
  assert.equal(isAuthorizedCron("Bearer secret", undefined), false, "secret non configuré : tout est refusé");
  assert.equal(isAuthorizedCron("Bearer secret", "secret"), true);
});
