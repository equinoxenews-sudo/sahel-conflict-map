import assert from "node:assert/strict";
import test from "node:test";
import {
  formatArea,
  formatGdp,
  formatPercent,
  formatPopulation,
  indicatorFields,
  mergeIndicatorFields,
} from "../lib/countryIndicators";

test("population : millions avec une décimale, milliers arrondis en dessous", () => {
  assert.equal(formatPopulation({ value: 68_720_337, year: 2025 }), "68,7 millions (2025)");
  assert.equal(formatPopulation({ value: 392_404, year: 2025 }), "392 000 (2025)");
});

test("superficie et PIB", () => {
  assert.equal(formatArea({ value: 606_410, year: 2023 }), "606 410 km² (2023)");
  assert.equal(formatGdp({ value: 3_366_315_927_447, year: 2025 }), "3 366 Md USD (2025)");
  assert.equal(formatGdp({ value: 27_771_821_560, year: 2025 }), "27,8 Md USD (2025)");
  assert.equal(formatGdp({ value: 640_000_000, year: 2025 }), "640 M USD (2025)");
});

test("croissance signée, inflation non signée", () => {
  assert.equal(formatPercent({ value: 0.84, year: 2025 }, true), "+0,8 % (2025)");
  assert.equal(formatPercent({ value: -1.2, year: 2025 }, true), "-1,2 % (2025)");
  assert.equal(formatPercent({ value: 8.72, year: 2025 }, false), "8,7 % (2025)");
});

test("un indicateur absent reste absent", () => {
  assert.deepEqual(indicatorFields(undefined), {});
  assert.deepEqual(indicatorFields({ area: { value: 100, year: 2023 } }), { area: "100 km² (2023)" });
});

test("une valeur du lot passe avant la Banque mondiale", () => {
  const merged = mergeIndicatorFields(
    { population: "1 million (saisie)", economy: { gdp: "10 Md USD (saisie)" } },
    { population: "2 millions (2025)", area: "50 km² (2023)", economy: { gdp: "99 Md USD (2025)", growth: "+1,0 % (2025)" } },
  );
  assert.equal(merged.population, "1 million (saisie)");
  assert.equal(merged.area, "50 km² (2023)");
  assert.deepEqual(merged.economy, { gdp: "10 Md USD (saisie)", growth: "+1,0 % (2025)", inflation: undefined });
});
