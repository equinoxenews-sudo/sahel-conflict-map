import assert from "node:assert/strict";
import test from "node:test";
import { clampQuery, ilikePattern, indexEntry, normalizeQuery, queryTokens, searchIndex, type SearchResult } from "../lib/search";
import { searchCountries, searchEntities } from "../lib/searchIndex";

const result = (title: string, detail = ""): SearchResult => ({ kind: "pays", label: "Pays", title, detail, href: `/${title}` });

test("la normalisation ignore accents, casse, ponctuation et tirets", () => {
  assert.equal(normalizeQuery("  Côte d'Ivoire "), "cote d ivoire");
  assert.equal(normalizeQuery("Guinée-Bissau"), "guinee bissau");
  assert.deepEqual(queryTokens("Forces  armées"), ["forces", "armees"]);
});

test("une recherche trop courte ne renvoie rien", () => {
  const index = [indexEntry(result("Soudan"))];
  assert.deepEqual(searchIndex(index, "s"), []);
  assert.deepEqual(searchIndex(index, "  "), []);
});

test("tous les mots doivent être présents, dans le titre ou le détail", () => {
  const index = [indexEntry(result("Soudan", "Fiche pays · Afrique")), indexEntry(result("Soudan du Sud", "Fiche pays · Afrique")), indexEntry(result("Syrie", "Fiche pays · Moyen-Orient"))];
  assert.deepEqual(searchIndex(index, "soudan sud").map((r) => r.title), ["Soudan du Sud"]);
  assert.deepEqual(searchIndex(index, "afrique").map((r) => r.title).sort(), ["Soudan", "Soudan du Sud"]);
  assert.deepEqual(searchIndex(index, "inconnu"), []);
});

test("le titre exact passe avant le titre qui commence par la recherche, puis le reste", () => {
  const index = [indexEntry(result("Guinée équatoriale")), indexEntry(result("Papouasie-Nouvelle-Guinée")), indexEntry(result("Guinée"))];
  assert.deepEqual(searchIndex(index, "guinee").map((r) => r.title), ["Guinée", "Guinée équatoriale", "Papouasie-Nouvelle-Guinée"]);
});

test("la limite de résultats est respectée", () => {
  const index = Array.from({ length: 20 }, (_, n) => indexEntry(result(`Pays ${n}`)));
  assert.equal(searchIndex(index, "pays", 5).length, 5);
});

test("le motif ilike écarte les caractères qui cassent un filtre", () => {
  assert.equal(ilikePattern("100%_vrai, (test)"), "%100 vrai test%");
  assert.equal(ilikePattern("Soudan"), "%Soudan%");
  assert.equal(clampQuery("  a   b  "), "a b");
  assert.equal(clampQuery("x".repeat(200)).length, 80);
});

test("l'index des pays retrouve un pays par son nom, sans accent, ou par sa capitale", () => {
  assert.equal(searchCountries("soudan")[0]?.title, "Soudan");
  assert.equal(searchCountries("cote d ivoire")[0]?.title, "Côte d'Ivoire");
  assert.ok(searchCountries("khartoum").some((r) => r.title === "Soudan"));
  const soudan = searchCountries("soudan")[0];
  assert.match(soudan.href, /^\/zones\/afrique\/approche\/pays\/soudan$/);
  assert.equal(soudan.iso2, "SD");
});

test("l'index des entités reprend les acteurs des fiches, sans les modèles génériques ni les États", () => {
  const hezbollah = searchEntities("hezbollah");
  assert.equal(hezbollah[0]?.kind, "entites");
  assert.equal(hezbollah[0]?.title, "Hezbollah");
  assert.match(hezbollah[0].href, /\/approche\/pays\/liban$/);
  assert.deepEqual(searchEntities("gouvernement de mali"), []);
  // « Iran » comme acteur étranger est déjà un pays : il n'apparaît pas deux fois.
  assert.ok(!searchEntities("iran").some((r) => r.title === "Iran"));
});
