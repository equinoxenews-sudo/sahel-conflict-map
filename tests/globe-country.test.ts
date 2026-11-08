import assert from "node:assert/strict";
import test from "node:test";
import { countryArticleCount, countryCodeOfEntityId, DEFAULT_PERIOD_DAYS, effectivePeriod, globeCountryInfo, periodLabel } from "../lib/globeCountry";

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

test("polygones d'un pays en plusieurs morceaux : l'identifiant suffixé de Cesium redonne le code du pays", () => {
  assert.equal(countryCodeOfEntityId("FRA"), "FRA");
  assert.equal(countryCodeOfEntityId("FRA_2"), "FRA", "la France métropolitaine est le deuxième morceau du fond de carte");
  assert.equal(countryCodeOfEntityId("GBR_2"), "GBR");
  assert.equal(countryCodeOfEntityId("ITA_3"), "ITA");
  assert.equal(countryCodeOfEntityId("CS-KM"), "CS-KM", "le Kosovo garde son code");
  assert.equal(countryCodeOfEntityId("-99_2"), "-99");
});

test("fond de carte : chaque polygone de chaque pays retrouve un code connu, y compris les morceaux suivants", async () => {
  const fs = await import("node:fs");
  const world = JSON.parse(fs.readFileSync("public/data/world-countries.geo.json", "utf8")) as { features: { id: string; geometry: { type: string; coordinates: unknown[] } }[] };
  // Comme GeoJsonDataSource : un identifiant déjà pris reçoit « _2 », « _3 »…
  const taken = new Set<string>();
  let checked = 0;
  for (const feature of world.features) {
    const pieces = feature.geometry.type === "Polygon" ? 1 : feature.geometry.coordinates.length;
    for (let i = 0; i < pieces; i++) {
      let id = feature.id;
      for (let n = 2; taken.has(id); n++) id = `${feature.id}_${n}`;
      taken.add(id);
      assert.equal(countryCodeOfEntityId(id), feature.id, id);
      checked++;
    }
  }
  assert.ok(checked > 250, "tous les morceaux sont vérifiés");
  // Les deux pays de la capture : leur morceau principal n'est PAS le premier.
  const france = world.features.find((feature) => feature.id === "FRA");
  assert.ok(france && france.geometry.type === "MultiPolygon" && france.geometry.coordinates.length >= 2);
  assert.equal(globeCountryInfo(countryCodeOfEntityId("FRA_2"), "France").href, "/zones/europe/approche/pays/france");
  assert.equal(globeCountryInfo(countryCodeOfEntityId("GBR_2"), "United Kingdom").name, "Royaume-Uni");
});
