import assert from "node:assert/strict";
import test from "node:test";
import { formatDateTimeParis } from "../lib/formatDate";

test("date d'une actualité : jour, mois, année et heure de Paris, en hiver comme en été", () => {
  assert.equal(formatDateTimeParis("2026-11-12T07:27:00Z"), "12 nov. 2026 · 08:27");
  assert.equal(formatDateTimeParis("2026-07-03T16:05:00Z"), "3 juil. 2026 · 18:05");
});

test("une publication de fin de soirée à Paris porte bien la date de Paris, pas celle du temps universel", () => {
  assert.equal(formatDateTimeParis("2026-11-11T23:30:00Z"), "12 nov. 2026 · 00:30");
});

test("date absente ou illisible : rien n'est affiché", () => {
  assert.equal(formatDateTimeParis(null), "");
  assert.equal(formatDateTimeParis(undefined), "");
  assert.equal(formatDateTimeParis("pas une date"), "");
});
