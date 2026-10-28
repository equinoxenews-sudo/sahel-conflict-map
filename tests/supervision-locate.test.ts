import assert from "node:assert/strict";
import test from "node:test";
import { buildLocatePrompt, parseLocations, placeAgainstZone } from "../lib/supervision/locate";
import { countryNames } from "../lib/supervision/geo";
import type { Zone } from "../lib/supervision/model";

const CIRCLE: Zone = { kind: "circle", lat: 10.93, lon: 2.35, radiusKm: 185 };

test("la consigne contient les publications numérotées et l'interdiction d'inventer un lieu", () => {
  const prompt = buildLocatePrompt([{ id: 4, title: "Le JNIM attaque Niamana", excerpt: "x".repeat(900), source: "NaimInfo2" }]);
  assert.ok(prompt.includes('"id":4'));
  assert.ok(!prompt.includes("x".repeat(301)));
  assert.ok(prompt.includes("N'invente aucun lieu"));
});

test("la réponse du modèle est vérifiée : identifiant connu, précision reconnue, lieu inconnu laissé vide", () => {
  const ids = new Set([1, 2, 3, 4]);
  const reply = `Voici : ${JSON.stringify([
    { id: 1, lieu: "Niamana", pays: "Burkina Faso", precision: "localite" },
    { id: 2, lieu: "inconnu", pays: "Niger", precision: "pays" },
    { id: 3, lieu: null, pays: null, precision: "n'importe quoi" },
    { id: 99, lieu: "Ailleurs", pays: "X", precision: "localite" },
    { id: 1, lieu: "Doublon", pays: "Y", precision: "localite" },
  ])}`;
  const out = parseLocations(reply, ids);
  assert.deepEqual(out.get(1), { place: "Niamana", country: "Burkina Faso", precision: "localite" });
  assert.deepEqual(out.get(2), { place: null, country: "Niger", precision: "pays" });
  assert.deepEqual(out.get(3), { place: null, country: null, precision: "inconnu" });
  assert.equal(out.has(99), false);
  assert.equal(out.has(4), false);
  assert.equal(parseLocations("désolé", ids).size, 0);
});

test("un lieu trouvé se juge sur le cercle, avec une petite tolérance au bord", () => {
  assert.equal(placeAgainstZone(CIRCLE, { lat: 11.13, lon: 2.94 }, "Bénin", undefined), "inside"); // Kandi
  assert.equal(placeAgainstZone(CIRCLE, { lat: 12.0, lon: -1.5 }, "Burkina Faso", undefined), "outside"); // Ouagadougou
  assert.equal(placeAgainstZone(CIRCLE, { lat: 16.97, lon: 7.99 }, "Niger", undefined), "outside"); // Agadez
  assert.equal(placeAgainstZone(CIRCLE, null, "Niger", undefined), "unknown");
});

test("une zone de pays se juge sur le pays donné par le modèle", () => {
  const zone: Zone = { kind: "countries", codes: ["BJ"] };
  const names = countryNames(zone.codes);
  assert.equal(placeAgainstZone(zone, null, "Bénin", names), "inside");
  assert.equal(placeAgainstZone(zone, null, "Burkina Faso", names), "outside");
  assert.equal(placeAgainstZone(zone, null, null, names), "unknown");
});
