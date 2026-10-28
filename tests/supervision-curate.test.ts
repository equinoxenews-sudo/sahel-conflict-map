import assert from "node:assert/strict";
import test from "node:test";
import { buildCuratePrompt, decideKeep, parseCurated } from "../lib/supervision/curate";
import { countryNames } from "../lib/supervision/geo";
import type { Zone } from "../lib/supervision/model";
import { homeCountryWords } from "../lib/supervision/nearby";
import { allWorldCountryFeatures } from "../lib/worldGeo";

const CIRCLE: Zone = { kind: "circle", lat: 10.93, lon: 2.35, radiusKm: 185 };
const HOME = homeCountryWords(allWorldCountryFeatures(), CIRCLE.lat, CIRCLE.lon);

test("le pays du centre d'une zone est trouvé", () => {
  assert.ok(HOME.has("benin"));
  assert.ok(!HOME.has("niger"));
});

test("la consigne porte la veille, le besoin, les exclusions et les règles de tri", () => {
  const prompt = buildCuratePrompt(
    { name: "Nord Bénin", userRequest: "Sécurité au nord du Bénin", zone: CIRCLE, criteria: { themes: [], entities: ["JNIM"], keywords: ["braconnage"], exclusions: ["football"], languages: [] } },
    [{ id: 3, title: "Le Rangers gagne 2-0", excerpt: "x".repeat(900), source: "presse" }],
  );
  assert.ok(prompt.includes("Nord Bénin"));
  assert.ok(prompt.includes("football"));
  assert.ok(prompt.includes('"id":3'));
  assert.ok(!prompt.includes("x".repeat(321)));
  assert.ok(prompt.includes("Ne juge PAS la distance"));
  assert.ok(prompt.includes("sport"));
});

test("la réponse du modèle est vérifiée : titre français, thèmes valides, mot anglais écarté", () => {
  const ids = new Set([1, 2, 3]);
  const reply = `Voici ${JSON.stringify([
    { id: 1, pertinent: true, raison: "attaque armée", titre: "Attaque contre un poste de l'armée à Karimama", resume: "Des hommes armés ont attaqué un poste.", themes: ["terrorism", "inventé", "conflicts"], lieu: "Karimama", region: "Alibori", pays: "Bénin", precision: "localite", pertinence: 140 },
    { id: 2, pertinent: false, raison: "football", titre: "Match de football", resume: "", themes: [], lieu: null, region: null, pays: "Nigeria", precision: "inconnu", pertinence: 5 },
    { id: 3, pertinent: true, raison: "x", titre: "Deepening du partenariat sécuritaire", resume: "Un résumé.", themes: [], lieu: "inconnu", region: null, pays: null, precision: "nimporte", pertinence: "beaucoup" },
    { id: 99, pertinent: true },
    { id: 1, pertinent: false },
    { id: 4 },
  ])}`;
  const out = parseCurated(reply, ids);
  const first = out.get(1);
  assert.ok(first);
  assert.equal(first.relevant, true);
  assert.equal(first.relevance, 100);
  assert.deepEqual(first.themes, ["terrorism", "conflicts"]);
  assert.equal(first.titleFr, "Attaque contre un poste de l'armée à Karimama");
  assert.equal(out.get(2)?.relevant, false);
  assert.equal(out.get(2)?.relevance, 5);
  const third = out.get(3);
  assert.equal(third?.titleFr, null, "un titre qui garde un mot anglais n'est pas affiché");
  assert.equal(third?.place, null);
  assert.equal(third?.precision, "inconnu");
  assert.equal(third?.relevance, 60);
  assert.equal(out.has(99), false);
  assert.equal(parseCurated("désolé", ids).size, 0);
});

const none = { regionCentre: null, locality: null, homeWords: HOME, zoneCountries: undefined, country: null as string | null };

test("une localité se juge à sa distance, avec une petite tolérance", () => {
  assert.equal(decideKeep({ ...none, zone: CIRCLE, locality: { lat: 12.07, lon: 3.18 }, country: "Bénin" }).keep, true); // Karimama
  const niamana = decideKeep({ ...none, zone: CIRCLE, locality: { lat: 10.8, lon: -5.4 }, country: "Burkina Faso" });
  assert.equal(niamana.keep, false);
  assert.match(niamana.why, /hors de la zone/);
  assert.equal(decideKeep({ ...none, zone: CIRCLE, locality: { lat: 16.97, lon: 7.99 }, country: "Niger" }).keep, false); // Agadez
});

test("un centre de région se juge avec une tolérance plus large", () => {
  assert.equal(decideKeep({ ...none, zone: CIRCLE, regionCentre: { lat: 11.4, lon: 3.5 }, country: "Bénin" }).keep, true);
  assert.equal(decideKeep({ ...none, zone: CIRCLE, regionCentre: { lat: 11.0, lon: -4.0 }, country: "Burkina Faso" }).keep, false); // Hauts-Bassins
});

test("sans lieu : le pays de la zone reste, un pays voisin est écarté, un pays inconnu reste non placé", () => {
  assert.equal(decideKeep({ ...none, zone: CIRCLE, country: "Bénin" }).keep, true);
  const neighbour = decideKeep({ ...none, zone: CIRCLE, country: "Burkina Faso" });
  assert.equal(neighbour.keep, false);
  assert.match(neighbour.why, /voisin/);
  assert.equal(decideKeep({ ...none, zone: CIRCLE, country: null }).keep, true);
});

test("une zone de pays se juge sur le pays donné", () => {
  const zone: Zone = { kind: "countries", codes: ["BJ"] };
  const names = countryNames(zone.codes);
  assert.equal(decideKeep({ ...none, zone, zoneCountries: names, country: "Bénin" }).keep, true);
  assert.equal(decideKeep({ ...none, zone, zoneCountries: names, country: "Niger" }).keep, false);
});
