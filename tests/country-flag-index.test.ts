import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { COUNTRY_PROFILES_LIST } from "../lib/countries";
import { FLAG_COUNTRIES } from "../lib/countryFlagIndex";

// L'index propose tous les pays qui ont un drapeau dans public/flags (États-Unis, Inde, Canada…),
// qu'ils aient ou non une fiche pays. Le nom vient de la fiche pays quand elle existe, sinon de
// la base de noms de régions (Intl) en français.
test("L'index des drapeaux est à jour avec les drapeaux (regénérer : npx tsx scripts/gen-country-flag-index.ts)", () => {
  const regionNames = new Intl.DisplayNames(["fr"], { type: "region" });
  const profileNames = new Map(COUNTRY_PROFILES_LIST.filter((p) => p.iso2).map((p) => [String(p.iso2).toUpperCase(), p.name] as const));
  const expected = fs
    .readdirSync(path.join(process.cwd(), "public", "flags"))
    .filter((file) => /^[a-z]{2}\.svg$/.test(file))
    .map((file) => file.slice(0, 2).toUpperCase())
    .map((iso2) => ({ iso2, name: profileNames.get(iso2) ?? regionNames.of(iso2) ?? iso2 }))
    .filter((row) => row.name !== row.iso2)
    .map((row) => `${row.iso2}:${row.name}`)
    .sort();
  const actual = FLAG_COUNTRIES.map((c) => `${c.iso2}:${c.name}`).sort();
  assert.deepEqual(actual, expected);
});

test("Chaque pays de l'index a son fichier drapeau", () => {
  for (const country of FLAG_COUNTRIES) {
    assert.ok(fs.existsSync(path.join(process.cwd(), "public", "flags", `${country.iso2.toLowerCase()}.svg`)), country.iso2);
  }
});

test("Un pays qui a une fiche pays garde le nom de sa fiche", () => {
  const byIso = new Map(FLAG_COUNTRIES.map((c) => [c.iso2, c.name]));
  for (const profile of COUNTRY_PROFILES_LIST) {
    if (profile.iso2 && byIso.has(String(profile.iso2).toUpperCase())) {
      assert.equal(byIso.get(String(profile.iso2).toUpperCase()), profile.name, String(profile.iso2));
    }
  }
});
