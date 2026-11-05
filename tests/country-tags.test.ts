import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { COUNTRY_CODES } from "../lib/countryCodes";
import { countriesInText, countryNameOf, iso2Of, iso3FromLabel, MAX_COUNTRY_TAGS, mentionsAny, parseCountryTags, searchTermsOf } from "../lib/countryTags";

test("noms de pays en codes ISO 3, y compris les pays sans fiche sur le site", () => {
  assert.equal(iso3FromLabel("Mali"), "MLI");
  assert.equal(iso3FromLabel("États-Unis"), "USA");
  assert.equal(iso3FromLabel("Etats-Unis"), "USA");
  assert.equal(iso3FromLabel("Royaume-Uni"), "GBR");
  assert.equal(iso3FromLabel("RDC"), "COD");
  assert.equal(iso3FromLabel("République démocratique du Congo"), "COD");
  assert.equal(iso3FromLabel("Singapour"), "SGP");
  assert.equal(iso3FromLabel("Corée du Sud"), "KOR");
  assert.equal(iso3FromLabel("Atlantide"), null);
  assert.equal(countryNameOf("DZA"), "Algérie");
  assert.equal(iso2Of("DZA"), "DZ");
});

test("la table des pays est cohérente : codes uniques, noms non vides", () => {
  assert.ok(COUNTRY_CODES.length >= 190);
  assert.equal(new Set(COUNTRY_CODES.map((c) => c.iso3)).size, COUNTRY_CODES.length, "un code ISO 3 par pays");
  assert.equal(new Set(COUNTRY_CODES.map((c) => c.iso2)).size, COUNTRY_CODES.length);
  for (const country of COUNTRY_CODES) assert.ok(/^[A-Z]{2}$/.test(country.iso2) && /^([A-Z]{3}|CS-KM)$/.test(country.iso3) && country.name, country.iso3);
});

test("tags de l'analyste : doublons retirés, ordre gardé, inconnus ignorés mais signalés, plafond respecté", () => {
  const parsed = parseCountryTags(["Russie", "Ukraine", "russie", "Atlantide", "  ", 12, "Pologne", "Allemagne", "France", "Italie"]);
  assert.deepEqual(parsed.iso3, ["RUS", "UKR", "POL", "DEU", "FRA"]);
  assert.equal(parsed.iso3.length, MAX_COUNTRY_TAGS);
  assert.deepEqual(parsed.unknown, ["Atlantide"]);
  assert.deepEqual(parseCountryTags(undefined), { iso3: [], unknown: [] });
  assert.deepEqual(parseCountryTags("Mali"), { iso3: [], unknown: [] });
});

test("un pays n'est reconnu que s'il est nommé en entier : Niger n'est pas Nigeria, Mali n'est pas Somalie", () => {
  assert.equal(mentionsAny("Attaque près de Niamey, au Niger", searchTermsOf("NER")), true);
  assert.equal(mentionsAny("Le Nigeria suspend ses vols", searchTermsOf("NER")), false);
  assert.equal(mentionsAny("Des pirates au large de la Somalie", searchTermsOf("MLI")), false);
  assert.equal(mentionsAny("Le Mali et le Burkina Faso", searchTermsOf("MLI")), true);
  assert.equal(mentionsAny("Tension entre Alger et l'Algérie voisine", searchTermsOf("DZA")), true);
  assert.equal(mentionsAny("un coup d'État en RDC", searchTermsOf("COD")), true);
  assert.equal(mentionsAny("Washington et les États-Unis", searchTermsOf("USA")), true);
  assert.equal(mentionsAny("texte", []), false);
});

test("rattrapage par le texte : pays dans l'ordre d'apparition, trois au plus", () => {
  assert.deepEqual(countriesInText("Frappe russe en Ukraine, réaction de la Pologne et de l'Allemagne"), ["UKR", "POL", "DEU"]);
  assert.deepEqual(countriesInText("Rien à signaler ici"), []);
});

test("la consigne de l'analyste demande les tags pays à la fin de chaque article, et la lecture les range en codes", () => {
  const prompt = fs.readFileSync("lib/synthesizeBriefs.ts", "utf8");
  assert.ok(prompt.includes("Tags pays"), "consigne présente");
  assert.ok(/"sourceIndexes": \[0, 2\], "countries": \["Burkina Faso"\]/.test(prompt), "champ countries après sourceIndexes dans l'exemple");
  assert.ok(prompt.includes("parseCountryTags"));
});

test("la migration crée la colonne et son index ; les pages lisent sans elle si elle manque", () => {
  const sql = fs.readFileSync("supabase/add-brief-countries.sql", "utf8");
  assert.ok(/add column if not exists countries text\[\]/.test(sql));
  assert.ok(/using gin \(countries\)/.test(sql));
  const zoneBriefs = fs.readFileSync("lib/zoneBriefs.ts", "utf8");
  assert.ok(zoneBriefs.includes("BRIEF_TAG_COLUMN") && /load\(BRIEF_COLUMNS\)/.test(zoneBriefs), "repli sans la colonne");
});
