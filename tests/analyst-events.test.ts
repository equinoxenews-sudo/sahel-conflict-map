import assert from "node:assert/strict";
import test from "node:test";
import { countryRiskFromAnalystEvents, eventWeight, tierForScore, type AnalystEvent } from "../lib/layers/analystRisk";

const now = Date.parse("2026-10-18T12:00:00Z");
const ev = (over: Partial<AnalystEvent>): AnalystEvent => ({
  id: 1, zone: "afrique", title: "t", publishedAt: "2026-10-18T06:00:00Z", lat: 12, lon: -1,
  place: null, country: "Burkina Faso", confidence: 80, confidenceLabel: "Très probable", claimedBy: null,
  importance: "medium", theme: "conflicts", eventType: null, precision: "ville", ...over,
});

test("poids : gravité, confiance, fraîcheur et thème", () => {
  const base = eventWeight(ev({}), now);
  assert.ok(eventWeight(ev({ importance: "high" }), now) > base);
  assert.ok(eventWeight(ev({ confidence: 20 }), now) < base);
  assert.ok(eventWeight(ev({ publishedAt: "2026-10-08T06:00:00Z" }), now) < base * 0.55);
  assert.ok(eventWeight(ev({ theme: "economy" }), now) < base / 3);
});

test("violence : doctrine, exercice, renseignement et criminalité ne comptent qu'un quart ; les violences comptent en plein", () => {
  const base = eventWeight(ev({}), now);
  for (const theme of ["defense_security", "intelligence_influence", "crime_trafficking", "politics", "diplomacy"]) {
    assert.equal(eventWeight(ev({ theme }), now), base * 0.25, theme);
  }
  for (const theme of ["conflicts", "terrorism", "civil_unrest"]) assert.equal(eventWeight(ev({ theme }), now), base, theme);
  // Une frappe classée « défense » reste une frappe ; un exercice militaire n'en est pas une.
  assert.equal(eventWeight(ev({ theme: "defense_security", eventType: "missile_attack" }), now), base);
  assert.equal(eventWeight(ev({ theme: "defense_security", eventType: "military_exercise" }), now), base * 0.25);
  // Ni thème ni type (articles d'avant les analystes V2) : on ne peut pas juger, plein poids.
  assert.equal(eventWeight(ev({ theme: null, eventType: null }), now), base);
});

test("un pays où l'on ne parle que de doctrine et d'exercices ne devient pas rouge", () => {
  const doctrine = Array.from({ length: 6 }, (_, i) => ev({ id: i, country: "Allemagne", importance: "high", theme: "defense_security", eventType: "military_exercise" }));
  const risk = countryRiskFromAnalystEvents(doctrine, now);
  assert.notEqual(risk.DEU?.tier, "critical");
  const attacks = Array.from({ length: 4 }, (_, i) => ev({ id: i, country: "Allemagne", importance: "high", theme: "terrorism", eventType: "terrorist_attack" }));
  assert.equal(countryRiskFromAnalystEvents(attacks, now).DEU?.tier, "critical");
});

test("niveaux : un fait isolé reste en jaune, plusieurs faits graves passent au rouge", () => {
  assert.equal(tierForScore(0.1), null);
  const one = countryRiskFromAnalystEvents([ev({})], now);
  assert.equal(one.BFA?.tier, "watch");
  const many = countryRiskFromAnalystEvents(Array.from({ length: 4 }, (_, i) => ev({ id: i, importance: "high" })), now);
  assert.equal(many.BFA?.tier, "critical");
  assert.match(many.BFA.label, /4 événements analysés/);
});

test("pays inconnu ou absent : ignoré", () => {
  assert.deepEqual(countryRiskFromAnalystEvents([ev({ country: null }), ev({ country: "Atlantide" })], now), {});
});
