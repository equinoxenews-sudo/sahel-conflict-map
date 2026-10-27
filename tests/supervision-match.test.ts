import assert from "node:assert/strict";
import test from "node:test";
import { countryNames, distanceKm, foldName, inZone } from "../lib/supervision/geo";
import { matchCandidate } from "../lib/supervision/match";
import type { Criteria, Zone } from "../lib/supervision/model";

const EL_FASHER: Zone = { kind: "circle", lat: 13.63, lon: 25.35, radiusKm: 150 };
const CRITERIA: Criteria = { themes: [], entities: ["RSF"], keywords: ["El Fasher", "Darfour"], exclusions: ["football"], languages: [] };

test("la distance entre deux villes connues est juste à quelques kilomètres près", () => {
  // Paris - Londres : environ 344 km.
  assert.ok(Math.abs(distanceKm(48.8566, 2.3522, 51.5074, -0.1278) - 344) < 5);
  assert.equal(Math.round(distanceKm(10, 10, 10, 10)), 0);
});

test("un cercle retient ce qui est dedans et écarte le reste", () => {
  assert.deepEqual(inZone(EL_FASHER, { latitude: 13.7, longitude: 25.4 }), { inside: true, distanceKm: 9 });
  assert.deepEqual(inZone(EL_FASHER, { latitude: 15.5, longitude: 32.5 }), { inside: false }); // Khartoum
  assert.deepEqual(inZone(EL_FASHER, { latitude: null, longitude: null }), { inside: false });
});

test("une zone de pays se juge sur le nom du pays, sans accents ni casse", () => {
  const zone: Zone = { kind: "countries", codes: ["ML", "BF"] };
  const names = countryNames(zone.codes);
  assert.ok(names.has("mali"));
  assert.deepEqual(inZone(zone, { latitude: null, longitude: null, country: "MALI" }, names), { inside: true, distanceKm: null });
  assert.deepEqual(inZone(zone, { latitude: null, longitude: null, country: "Niger" }, names), { inside: false });
  assert.equal(foldName("Côte d'Ivoire"), "cote d ivoire");
});

test("un mot-clé et une entité retiennent un élément localisé dans la zone, avec la raison", () => {
  const result = matchCandidate({ title: "Les RSF frappent El Fasher", latitude: 13.62, longitude: 25.35 }, EL_FASHER, CRITERIA);
  assert.equal(result.matched, true);
  assert.equal(result.unlocated, false);
  assert.ok(result.score >= 5);
  assert.match(result.reason, /RSF/);
  assert.match(result.reason, /dans la zone/);
});

test("un lieu connu hors de la zone écarte l'élément même s'il cite un mot-clé", () => {
  const result = matchCandidate({ title: "Réunion sur le Darfour à Genève", latitude: 46.2, longitude: 6.14 }, EL_FASHER, CRITERIA);
  assert.equal(result.matched, false);
  assert.equal(result.reason, "Hors de la zone");
});

test("sans lieu, un élément qui cite un terme est retenu mais marqué non localisé", () => {
  const result = matchCandidate({ title: "Situation humanitaire au Darfour", excerpt: "Des civils fuient.", latitude: null, longitude: null }, EL_FASHER, CRITERIA);
  assert.equal(result.matched, true);
  assert.equal(result.unlocated, true);
});

test("sans lieu ni terme, rien n'est retenu", () => {
  const result = matchCandidate({ title: "Match de la ligue des champions", latitude: null, longitude: null }, EL_FASHER, CRITERIA);
  assert.equal(result.matched, false);
});

test("une exclusion l'emporte sur tout", () => {
  const result = matchCandidate({ title: "Football : le Darfour United gagne à El Fasher", latitude: 13.6, longitude: 25.3 }, EL_FASHER, CRITERIA);
  assert.equal(result.matched, false);
  assert.match(result.reason, /football/i);
});

test("les mots sont comparés entiers, pas en morceaux", () => {
  const criteria: Criteria = { themes: [], entities: [], keywords: ["Mali"], exclusions: [], languages: [] };
  assert.equal(matchCandidate({ title: "Le Malinké est une langue", latitude: null, longitude: null }, EL_FASHER, criteria).matched, false);
  assert.equal(matchCandidate({ title: "Attaque au Mali", latitude: null, longitude: null }, EL_FASHER, criteria).matched, true);
});

test("les mots-clés en arabe sont reconnus", () => {
  const criteria: Criteria = { themes: [], entities: [], keywords: ["الفاشر"], exclusions: [], languages: [] };
  assert.equal(matchCandidate({ title: "قصف على الفاشر اليوم", latitude: null, longitude: null }, EL_FASHER, criteria).matched, true);
});

test("une veille par thèmes seulement exige un lieu connu dans la zone", () => {
  const criteria: Criteria = { themes: ["conflicts"], entities: [], keywords: [], exclusions: [], languages: [] };
  assert.equal(matchCandidate({ title: "Combats", latitude: 13.6, longitude: 25.3 }, EL_FASHER, criteria).matched, true);
  assert.equal(matchCandidate({ title: "Combats", latitude: null, longitude: null }, EL_FASHER, criteria).matched, false);
});
