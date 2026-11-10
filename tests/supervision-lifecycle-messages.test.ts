import assert from "node:assert/strict";
import test from "node:test";
import { lifecycleMessage } from "../lib/supervision/core/lifecycleMessages";

test("limites : la phrase donne le nombre autorisé et dit quoi faire, au singulier et au pluriel", () => {
  assert.match(lifecycleMessage("active_limit_reached", { limit: 1 }), /déjà 1 Supervision active : mets-en une en pause/);
  assert.match(lifecycleMessage("active_limit_reached", { limit: 3 }), /déjà 3 Supervisions actives/);
  assert.match(lifecycleMessage("paused_limit_reached", { limit: 3 }), /3 Supervisions en pause : reprends-en une/);
  assert.match(lifecycleMessage("active_limit_reached"), /mets-en une en pause d'abord/, "sans nombre fourni : une phrase correcte quand même");
});

test("crédit : la date de prochaine activation est affichée en français quand elle est connue", () => {
  const message = lifecycleMessage("credit_exhausted", { next_eligible_at: "2026-12-05T10:00:00Z" });
  assert.match(message, /5 décembre 2026/);
  assert.match(lifecycleMessage("credit_exhausted", { next_eligible_at: "pas une date" }), /pour l'instant/);
  assert.match(lifecycleMessage("credit_exhausted"), /pour l'instant/);
});

test("activation échouée : on dit que rien n'a été consommé et que le brouillon est conservé", () => {
  const message = lifecycleMessage("activation_failed", { reason: "no_queries" });
  assert.match(message, /\(no_queries\)/);
  assert.match(message, /Rien n'a été consommé/);
  assert.match(message, /brouillon/);
  assert.doesNotMatch(lifecycleMessage("activation_failed"), /\(\)/);
});

test("chaque code d'échec connu a sa phrase ; un code inconnu ne montre jamais un code brut", () => {
  for (const code of ["access_denied", "read_only", "invalid_state", "already_running", "cancelled", "idempotency_conflict", "not_found", "locked", "forbidden"]) {
    const message = lifecycleMessage(code);
    assert.ok(message.length > 10 && !message.includes(code), code);
  }
  assert.equal(lifecycleMessage("quelque_chose_d_inattendu"), "L'opération a échoué. Réessaie dans un instant.");
  assert.equal(lifecycleMessage(undefined), "L'opération a échoué. Réessaie dans un instant.");
});
