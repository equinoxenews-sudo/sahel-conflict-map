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
