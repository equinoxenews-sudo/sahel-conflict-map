import assert from "node:assert/strict";
import test from "node:test";
import { countryArticleCount, DEFAULT_PERIOD_DAYS, effectivePeriod, globeCountryInfo, periodLabel } from "../lib/globeCountry";

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-04T12:00:00");

test("un pays d'une zone : nom français, drapeau et lien vers sa fiche Approche", () => {
  const sudan = globeCountryInfo("SDN", "Sudan");
  assert.equal(sudan.name, "Soudan");
  assert.equal(sudan.iso2, "SD");
  assert.equal(sudan.href, "/zones/afrique/approche/pays/soudan");
  assert.equal(globeCountryInfo("FRA", "France").href, "/zones/europe/approche/pays/france");
});

test("un pays hors des cinq zones garde le nom du fond de carte, sans lien ni drapeau", () => {
  const info = globeCountryInfo("USA", "United States of America");
  assert.deepEqual(info, { iso3: "USA", name: "United States of America", iso2: null, href: null });
});

test("la période par défaut est celle du curseur du globe : les 5 derniers jours jusqu'à ce soir", () => {
  const range = effectivePeriod(null, NOW);
  assert.equal(new Date(range.end).getDate(), 4);
  assert.equal(Math.round((range.end - range.start) / DAY), DEFAULT_PERIOD_DAYS);
  assert.equal(periodLabel(null, NOW), "5 derniers jours");
  assert.deepEqual(effectivePeriod({ start: 1, end: 2 }, NOW), { start: 1, end: 2 });
});

test("une période terminée dans le passé est datée", () => {
  const range = { start: Date.parse("2026-10-12T00:00:00"), end: Date.parse("2026-10-17T23:59:59") };
  assert.match(periodLabel(range, NOW), /^du 12 oct\.? au 17 oct\.?$/);
});

test("le nombre d'articles ne compte que le pays et la période", () => {
  const at = (days: number) => new Date(NOW - days * DAY).toISOString();
  const events = [
    { iso3: "SDN", publishedAt: at(0) },
    { iso3: "SDN", publishedAt: at(3) },
    { iso3: "SDN", publishedAt: at(10) },
    { iso3: "TCD", publishedAt: at(1) },
    { iso3: null, publishedAt: at(1) },
  ];
  assert.equal(countryArticleCount(events, "SDN", null, NOW), 2, "les 5 derniers jours par défaut");
  assert.equal(countryArticleCount(events, "SDN", { start: NOW - 30 * DAY, end: NOW + DAY }, NOW), 3, "période élargie");
  assert.equal(countryArticleCount(events, "MLI", null, NOW), 0);
});
