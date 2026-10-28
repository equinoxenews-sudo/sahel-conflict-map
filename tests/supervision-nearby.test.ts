import assert from "node:assert/strict";
import test from "node:test";
import { matchCandidate } from "../lib/supervision/match";
import { countryWordsNearCircle } from "../lib/supervision/nearby";
import type { Criteria, Zone } from "../lib/supervision/model";
import { allWorldCountryFeatures } from "../lib/worldGeo";

const NORD_BENIN: Zone = { kind: "circle", lat: 10.93, lon: 2.35, radiusKm: 185 };
const CRITERIA: Criteria = { themes: [], entities: ["JNIM", "RVIM"], keywords: [], exclusions: [], languages: [] };

test("les pays qui touchent un cercle du nord du Bénin sont trouvés, pas le Mali", () => {
  const words = countryWordsNearCircle(allWorldCountryFeatures(), NORD_BENIN.lat, NORD_BENIN.lon, NORD_BENIN.radiusKm);
  assert.ok(words.has("benin"), [...words].join(", "));
  assert.ok(words.has("niger"));
  assert.ok(words.has("burkina faso"));
  assert.ok(words.has("nigeria"));
  assert.ok(!words.has("mali"));
  assert.ok(!words.has("france"));
});

test("une publication sans lieu sur le JNIM au Mali n'est pas retenue pour une veille du nord du Bénin", () => {
  const words = countryWordsNearCircle(allWorldCountryFeatures(), NORD_BENIN.lat, NORD_BENIN.lon, NORD_BENIN.radiusKm);
  const mali = matchCandidate({ title: "Le JNIM revendique une attaque près de Kayes, au Mali", latitude: null, longitude: null }, NORD_BENIN, CRITERIA, undefined, words);
  assert.equal(mali.matched, false);
  assert.match(mali.reason, /aucun pays de la zone/);
  const benin = matchCandidate({ title: "Attaque du JNIM contre un poste de l'armée au Bénin", latitude: null, longitude: null }, NORD_BENIN, CRITERIA, undefined, words);
  assert.equal(benin.matched, true);
  assert.match(benin.reason, /bénin|benin/i);
  assert.equal(benin.unlocated, true);
});

test("sans mots de lieu disponibles, le comportement d'avant est conservé", () => {
  const result = matchCandidate({ title: "Le JNIM revendique une attaque", latitude: null, longitude: null }, NORD_BENIN, CRITERIA, undefined, null);
  assert.equal(result.matched, true);
});
