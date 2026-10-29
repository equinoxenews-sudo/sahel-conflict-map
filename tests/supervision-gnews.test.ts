import assert from "node:assert/strict";
import test from "node:test";
import { buildGnewsQueries, customGnewsQuery, googleNewsUrl, queryTerm, riskTerms, wantsEnglish } from "../lib/supervision/gnews";
import type { Criteria, Zone } from "../lib/supervision/model";

const ZONE: Zone = { kind: "circle", lat: 10.5, lon: 2.4, radiusKm: 250 };
const COUNTRIES = { home: ["Bénin", "Benin"], neighbours: ["Togo", "Niger", "Nigeria", "Burkina Faso"] };
const CRITERIA: Criteria = {
  themes: ["terrorism"],
  entities: ["Tchaourou", "Kika", "Pendjari", "JNIM", "African Parks", "Kandi", "Malanville"],
  keywords: ["enlèvement", "IED"],
  exclusions: ["football"],
  languages: ["français"],
};

test("un terme de plusieurs mots prend des guillemets, les caractères de syntaxe sont retirés", () => {
  assert.equal(queryTerm("African Parks"), '"African Parks"');
  assert.equal(queryTerm("Kika"), "Kika");
  assert.equal(queryTerm('(drôle) "mot"'), '"drôle mot"');
});

test("les termes de risque viennent des thèmes puis des mots-clés, sans doublon", () => {
  const terms = riskTerms(CRITERIA, "fr");
  assert.ok(terms.includes("attaque") && terms.includes("jihadistes"));
  assert.equal(terms.filter((term) => term.toLowerCase() === "enlèvement").length, 1);
  assert.ok(!riskTerms(CRITERIA, "en").includes("jihadistes"));
});

test("sans thème choisi, la sécurité sert par défaut", () => {
  const terms = riskTerms({ ...CRITERIA, themes: [] }, "fr");
  assert.ok(terms.includes("militaire") && terms.includes("attaque"));
});

test("les requêtes couvrent le pays, la bande frontalière et les entités, avec exclusions et ancienneté", () => {
  const queries = buildGnewsQueries(ZONE, CRITERIA, COUNTRIES).map((item) => item.query);
  assert.ok(queries.some((query) => query.startsWith("(Bénin OR Benin) (attaque")), "pays du centre");
  assert.ok(queries.some((query) => query.startsWith("(Togo OR Niger OR Nigeria OR \"Burkina Faso\") (Bénin OR Benin)")), "bande frontalière");
  assert.ok(queries.some((query) => query.startsWith("(Tchaourou OR Kika OR Pendjari OR JNIM)")), "entités");
  assert.ok(queries.some((query) => query.startsWith("(\"African Parks\" OR Kandi OR Malanville)")), "reste des entités");
  for (const query of queries) {
    assert.match(query, /-football when:14d$/);
    assert.ok(query.length <= 600);
  }
});

test("une zone de pays n'a pas de bande frontalière, l'anglais s'ajoute à la demande", () => {
  const countriesZone: Zone = { kind: "countries", codes: ["BJ"] };
  const fr = buildGnewsQueries(countriesZone, { ...CRITERIA, entities: [] }, { home: ["Bénin"], neighbours: [] });
  assert.equal(fr.length, 1);
  const both = buildGnewsQueries(countriesZone, { ...CRITERIA, entities: [], languages: ["français", "anglais"] }, { home: ["Bénin"], neighbours: [] });
  assert.deepEqual(both.map((item) => item.lang), ["fr", "en"]);
  assert.equal(wantsEnglish({ ...CRITERIA, languages: ["English"] }), true);
  assert.equal(wantsEnglish(CRITERIA), false);
});

test("jamais plus de douze requêtes en collecte courante, trente en historique", () => {
  const many: Criteria = { ...CRITERIA, entities: Array.from({ length: 30 }, (_, i) => `lieu${i}`), languages: ["français", "anglais"] };
  assert.ok(buildGnewsQueries(ZONE, many, COUNTRIES).length <= 12);
  const history = buildGnewsQueries(ZONE, many, COUNTRIES, 365);
  assert.ok(history.length > 12 && history.length <= 30);
});

test("la requête de l'utilisateur est gardée, avec l'ancienneté seulement s'il n'en donne pas", () => {
  assert.equal(customGnewsQuery("  Tchaourou   (attaque OR enlèvement) "), "Tchaourou (attaque OR enlèvement) when:14d");
  assert.equal(customGnewsQuery("Kika when:3d"), "Kika when:3d");
});

test("l'adresse du flux encode la requête et choisit l'édition", () => {
  const url = googleNewsUrl("Bénin attaque when:14d", "fr");
  assert.ok(url.startsWith("https://news.google.com/rss/search?q=B%C3%A9nin%20attaque%20when%3A14d&hl=fr&gl=FR&ceid=FR:fr"));
  assert.ok(googleNewsUrl("Benin attack", "en").endsWith("hl=en-US&gl=US&ceid=US:en"));
});

test("un historique d'un an demande trois cent soixante-cinq jours à Google, sur toutes les requêtes", () => {
  const queries = buildGnewsQueries(ZONE, CRITERIA, COUNTRIES, 365).map((item) => item.query);
  assert.ok(queries.length > 0);
  for (const query of queries) assert.match(query, /when:365d$/);
  assert.equal(customGnewsQuery("Kika", 365), "Kika when:365d");
});

test("en historique, chaque lieu a sa propre requête", () => {
  const queries = buildGnewsQueries(ZONE, CRITERIA, COUNTRIES, 365).map((item) => item.query);
  for (const place of ["Tchaourou", "Kika", "Pendjari", "JNIM", "\"African Parks\"", "Kandi", "Malanville"]) {
    assert.ok(queries.some((query) => query.startsWith(`(${place}) (`)), place);
  }
});
