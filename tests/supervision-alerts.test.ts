import assert from "node:assert/strict";
import test from "node:test";
import { alertMessage, alertReason, buildAlerts, countAlerts, effectiveStatus, validateDecision, type StoredDecision } from "../lib/supervision/alerts/rules";
import type { BoardEvent } from "../lib/supervision/dashboard/fixtures";

const event = (id: string, priority: BoardEvent["priority"], at: string, extra: Partial<BoardEvent> = {}): BoardEvent => ({
  id,
  kind: "article",
  title: `Événement ${id}`,
  theme: "conflits",
  priority,
  verification: "signalement",
  at,
  place: "Nigeria",
  publications: 1,
  ...extra,
});

const EVENTS = [
  event("a-1", "importante", "2026-11-08T10:00:00Z"),
  event("a-2", "critique", "2026-11-07T10:00:00Z"),
  event("a-3", "information", "2026-11-09T10:00:00Z"),
  event("e-4", "critique", "2026-11-09T09:00:00Z", { kind: "signal", publications: 25 }),
  event("p-5", "information", "2026-11-09T11:00:00Z", { kind: "publication" }),
];

test("une alerte naît d'un événement critique ou important ; « information » (dont toute publication de presse collectée) n'en déclenche jamais", () => {
  const alerts = buildAlerts(EVENTS, { state: "active" });
  assert.deepEqual(alerts.map((a) => a.id), ["e-4", "a-2", "a-1"], "critiques d'abord, les plus récentes en tête, puis les importantes");
  assert.ok(alerts.every((a) => a.level === "critique" || a.level === "importante"));
  assert.equal(buildAlerts([event("p-9", "information", "2026-11-09T00:00:00Z", { kind: "publication" })], { state: "active" }).length, 0);
});

test("états : le brouillon montre un aperçu, l'initialisation rien, la pause coupe les événements postérieurs, la lecture seule garde tout", () => {
  assert.equal(buildAlerts(EVENTS, { state: "draft" }).length, 3);
  assert.equal(buildAlerts(EVENTS, { state: "initializing" }).length, 0);
  assert.equal(buildAlerts(EVENTS, { state: "deleted" }).length, 0);
  // En pause depuis le 8 nov. 12 h : les événements du 9 nov. n'engendrent plus d'alerte, ceux d'avant restent.
  const paused = buildAlerts(EVENTS, { state: "paused", pausedAt: "2026-11-08T12:00:00Z" });
  assert.deepEqual(paused.map((a) => a.id), ["a-2", "a-1"]);
  assert.equal(buildAlerts(EVENTS, { state: "paused", pausedAt: null }).length, 3, "sans date de pause connue, rien n'est coupé");
  assert.equal(buildAlerts(EVENTS, { state: "read_only_grace" }).length, 3);
  assert.equal(buildAlerts(EVENTS, { state: "active", pausedAt: "2026-11-01T00:00:00Z" }).length, 3, "une ancienne pause ne coupe rien sur une Supervision active");
});

test("l'origine du classement est dite en clair, sans score opaque ni preuve de véracité", () => {
  assert.match(alertReason(event("a-1", "critique", "2026-11-08T10:00:00Z"), "critique"), /importance haute.*violent/);
  assert.doesNotMatch(alertReason(event("a-1", "importante", "2026-11-08T10:00:00Z"), "importante"), /violent/);
  const signal = alertReason(event("e-4", "critique", "2026-11-09T09:00:00Z", { kind: "signal", publications: 25 }), "critique");
  assert.match(signal, /25 mentions/);
  assert.match(signal, /pas la véracité/);
  assert.match(alertReason(event("e-5", "importante", "2026-11-09T09:00:00Z", { kind: "signal", publications: 1 }), "importante"), /1 mention \(importante à partir de 15, critique à partir de 20\)/);
});

test("une décision vaut pour le niveau où elle a été prise ; si l'alerte monte, elle redevient à traiter", () => {
  const alert = { level: "critique" as const };
  assert.equal(effectiveStatus(alert, undefined), "new");
  assert.equal(effectiveStatus(alert, { status: "read", level: "critique" }), "read");
  assert.equal(effectiveStatus(alert, { status: "hidden", level: "importante" }), "new", "montée importante → critique");
  assert.equal(effectiveStatus({ level: "importante" }, { status: "kept", level: "critique" }), "kept", "une baisse de niveau ne rouvre rien");
});

test("compteurs : à traiter (critiques et importantes), lues, conservées, masquées", () => {
  const alerts = buildAlerts(EVENTS, { state: "active" });
  const decisions = new Map<string, StoredDecision>([
    ["a-1", { status: "read", level: "importante" }],
    ["a-2", { status: "hidden", level: "critique" }],
  ]);
  assert.deepEqual(countAlerts(alerts, decisions), { new: 1, newCritical: 1, newImportant: 0, read: 1, kept: 0, hidden: 1 });
  assert.deepEqual(countAlerts(alerts, new Map()), { new: 3, newCritical: 2, newImportant: 1, read: 0, kept: 0, hidden: 0 });
});

test("saisie d'une décision : statut connu, alertes bien formées, doublons fusionnés, pas plus de 100", () => {
  const ok = validateDecision({ status: "read", items: [{ eventRef: "a-1", level: "critique" }, { eventRef: "a-1", level: "critique" }, { eventRef: "p-abc-1", level: "importante" }] });
  assert.ok(ok.ok);
  if (ok.ok) assert.deepEqual(ok.value.items.map((i) => i.eventRef), ["a-1", "p-abc-1"]);
  assert.ok(validateDecision({ status: "new", items: [{ eventRef: "e-2", level: "importante" }] }).ok, "rétablir est permis");
  for (const bad of [
    { status: "deleted", items: [{ eventRef: "a-1", level: "critique" }] },
    { status: "read", items: [] },
    { status: "read" },
    { status: "read", items: [{ eventRef: "a-1", level: "information" }] },
    { status: "read", items: [{ eventRef: "1", level: "critique" }] },
    { status: "read", items: [{ eventRef: "a-<b>", level: "critique" }] },
    { status: "read", items: ["a-1"] },
    null,
  ]) {
    assert.equal(validateDecision(bad).ok, false, JSON.stringify(bad));
  }
  const many = Array.from({ length: 101 }, (_, n) => ({ eventRef: `a-${n}`, level: "critique" }));
  const tooMany = validateDecision({ status: "read", items: many });
  assert.equal(tooMany.ok, false);
  if (!tooMany.ok) assert.match(tooMany.errors.join(" "), /100 au maximum/);
});

test("messages : chaque code connu a sa phrase, un code inconnu n'affiche jamais un code brut", () => {
  assert.match(alertMessage("limit_reached", { limit: 2000 }), /2000 au maximum/);
  for (const code of ["read_only", "not_found", "invalid_input", "locked", "forbidden"]) {
    const message = alertMessage(code);
    assert.ok(message.length > 10 && !message.includes(code), code);
  }
  assert.equal(alertMessage("inattendu"), "L'opération a échoué. Réessaie dans un instant.");
});
