import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { COUNTRY_PROFILES_LIST } from "../lib/countries";
import { FLAG_COUNTRIES } from "../lib/countryFlagIndex";

test("L'index des drapeaux est à jour avec les fiches pays (regénérer : npx tsx scripts/gen-country-flag-index.ts)", () => {
  const expected = COUNTRY_PROFILES_LIST
    .filter((p) => p.iso2 && fs.existsSync(path.join(process.cwd(), "public", "flags", `${p.iso2.toLowerCase()}.svg`)))
    .map((p) => `${p.iso2}:${p.name}`)
    .sort();
  const actual = FLAG_COUNTRIES.map((c) => `${c.iso2}:${c.name}`).sort();
  assert.deepEqual(actual, expected);
});

test("Chaque pays de l'index a son fichier drapeau", () => {
  for (const country of FLAG_COUNTRIES) {
    assert.ok(fs.existsSync(path.join(process.cwd(), "public", "flags", `${country.iso2.toLowerCase()}.svg`)), country.iso2);
  }
});
