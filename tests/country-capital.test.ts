import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { findCapitalByLabel, getCountryProfile } from "../lib/countries";

test("Guinée équatoriale : le modèle historique désigne Ciudad de la Paz comme capitale officielle depuis le 2 janvier 2026", () => {
  const capital = getCountryProfile("guinee-equatoriale")?.capital ?? "";
  assert.ok(capital.startsWith("Ciudad de la Paz"));
  assert.match(capital, /2 janvier 2026/);
  assert.ok(!/^Malabo/.test(capital), "Malabo n'est plus désignée comme capitale");
  // Cohérence avec la fiche du nouveau modèle.
  const file = JSON.parse(fs.readFileSync("data/approche/GNQ.json", "utf8")) as { observations: { key: string; value: string }[] };
  assert.ok(file.observations.find((observation) => observation.key === "identity.capital")?.value.startsWith("Ciudad de la Paz"));
});

test("la capitale en cours de transfert ne devient pas le point des informations d'ordre national : elles restent publiées, sans marqueur local", () => {
  assert.equal(getCountryProfile("guinee-equatoriale")?.capitalAnchorsNationalInfo, false);
  assert.equal(findCapitalByLabel("Guinée équatoriale"), null);
  // Les autres pays gardent leur capitale comme point de repli.
  assert.deepEqual(findCapitalByLabel("Mali"), { country: "Mali", capital: "Bamako" });
  assert.equal(findCapitalByLabel("Tchad")?.capital, "N'Djamena");
});
