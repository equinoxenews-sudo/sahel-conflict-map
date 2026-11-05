import assert from "node:assert/strict";
import test from "node:test";
import {
  DAY_MS,
  DEFAULT_SELECTED_DAYS,
  DEFAULT_SPAN_DAYS,
  absoluteLimits,
  clampSelection,
  defaultBounds,
  defaultSelection,
  fromInputValue,
  toInputValue,
  withEdge,
} from "../lib/globeTimeRange";

// Jeudi 5 novembre 2026, 15 h (heure locale).
const NOW = new Date(2026, 10, 5, 15, 0, 0).getTime();
const days = (a: number, b: number) => Math.round((b - a) / DAY_MS);

test("par défaut : les 5 derniers jours sélectionnés sur une frise de 10 jours, qui finit ce soir", () => {
  const bounds = defaultBounds(NOW);
  const selection = defaultSelection(NOW);
  assert.equal(DEFAULT_SPAN_DAYS, 10);
  assert.equal(DEFAULT_SELECTED_DAYS, 5);
  assert.equal(toInputValue(bounds.start), "2026-10-27");
  assert.equal(toInputValue(bounds.end), "2026-11-05");
  assert.equal(toInputValue(selection.start), "2026-11-01");
  assert.equal(toInputValue(selection.end), "2026-11-05");
  assert.equal(days(bounds.start, bounds.end + 1), 10);
  assert.equal(days(selection.start, selection.end + 1), 5);
  assert.ok(selection.start >= bounds.start && selection.end <= bounds.end, "la sélection est dans la frise");
  const share = (selection.end - selection.start) / (bounds.end - bounds.start);
  assert.ok(share > 0.45 && share < 0.55, "la plage occupe la moitié de la frise");
});

test("limites : 60 jours d'historique, 30 jours à venir", () => {
  const limits = absoluteLimits(NOW);
  assert.equal(toInputValue(limits.start), "2026-09-06");
  assert.equal(toInputValue(limits.end), "2026-12-05");
});

test("dates saisies : lues en jour local, début ou fin de journée, invalides refusées", () => {
  const start = fromInputValue("2026-11-01", false);
  const end = fromInputValue("2026-11-05", true);
  assert.equal(new Date(start as number).getHours(), 0);
  assert.equal(new Date(end as number).getHours(), 23);
  assert.equal(fromInputValue("", false), null);
  assert.equal(fromInputValue("2026-13-40", false), null);
  assert.equal(fromInputValue("2026-02-30", false), null);
  assert.equal(fromInputValue("pas une date", true), null);
});

test("calendrier de gauche : allonge la frise vers le passé, jamais au-delà des données ni à moins de 2 jours", () => {
  const bounds = defaultBounds(NOW);
  const longer = withEdge(bounds, "start", "2026-10-01", NOW);
  assert.equal(toInputValue(longer.start), "2026-10-01");
  assert.equal(longer.end, bounds.end, "la fin ne bouge pas");
  assert.equal(toInputValue(withEdge(bounds, "start", "2025-01-01", NOW).start), "2026-09-06", "pas plus de 60 jours d'historique");
  assert.equal(toInputValue(withEdge(bounds, "start", "2026-11-05", NOW).start), "2026-11-04", "au moins 2 jours");
  assert.equal(toInputValue(withEdge(bounds, "start", "2026-12-25", NOW).start), "2026-11-04", "jamais après la fin");
  assert.deepEqual(withEdge(bounds, "start", "n'importe quoi", NOW), bounds, "saisie invalide : frise inchangée");
});

test("calendrier de droite : allonge la frise vers l'avenir (lancements) ou la raccourcit, dans les limites", () => {
  const bounds = defaultBounds(NOW);
  const longer = withEdge(bounds, "end", "2026-11-20", NOW);
  assert.equal(toInputValue(longer.end), "2026-11-20");
  assert.equal(new Date(longer.end).getHours(), 23, "fin de journée");
  assert.equal(toInputValue(withEdge(bounds, "end", "2027-06-01", NOW).end), "2026-12-05", "pas plus de 30 jours à venir");
  assert.equal(toInputValue(withEdge(bounds, "end", "2026-10-01", NOW).end), "2026-10-28", "jamais moins de 2 jours");
  assert.equal(longer.start, bounds.start);
});

test("la sélection est ramenée dans la frise quand on la raccourcit : décalée, ou rognée si elle est plus large", () => {
  const bounds = defaultBounds(NOW);
  const selection = defaultSelection(NOW);
  const shorter = withEdge(bounds, "start", "2026-11-03", NOW);
  assert.equal(toInputValue(shorter.start), "2026-11-03");
  const clamped = clampSelection(selection, shorter);
  assert.ok(clamped.start >= shorter.start && clamped.end <= shorter.end);
  assert.equal(clamped.end - clamped.start, shorter.end - shorter.start, "rognée à la largeur de la frise");
  const shifted = clampSelection({ start: bounds.start - DAY_MS, end: bounds.start + 2 * DAY_MS }, bounds);
  assert.equal(shifted.start, bounds.start, "décalée dans la frise");
  assert.equal(shifted.end - shifted.start, 3 * DAY_MS, "même largeur");
  assert.deepEqual(clampSelection(selection, bounds), selection, "déjà dedans : inchangée");
});
