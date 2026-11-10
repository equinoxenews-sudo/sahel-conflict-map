import assert from "node:assert/strict";
import test from "node:test";
import type { ScopeSnapshot } from "../lib/supervision/core/majorChange";
import { matchItem } from "../lib/supervision/collect/match";
import { canonicalItemUrl, normalizeFeedItem, splitGoogleNewsTitle } from "../lib/supervision/collect/normalize";
import { buildQueries, countryNames, googleNewsUrl, queryTerm } from "../lib/supervision/collect/queries";
import { containsTerm, fold, themeOfText } from "../lib/supervision/collect/terms";
import type { FeedItem } from "../lib/rss";

const snapshot = (patch: Partial<ScopeSnapshot["scope"]> = {}, codes = ["NGA"]): ScopeSnapshot => ({
  scope: { primaryZone: { kind: "countries", codes }, objective: "securite", countries: codes, sources: [], keywords: [], entities: [], ...patch },
  estimate: { volumePerMonth: null, volumeConfidence: "unknown", aiCostUsdPerMonth: null, costConfidence: "unknown" },
});

const NOW = new Date("2026-11-10T12:00:00Z");
const feedItem = (patch: Partial<FeedItem> = {}): FeedItem => ({ title: "Nigeria : attaque contre un convoi - Le Monde", url: "https://news.google.com/rss/articles/ABC?oc=5", domain: "news.google.com", publishedAt: "2026-11-09T08:00:00.000Z", imageUrl: null, excerpt: "", ...patch });

test("texte comparable : sans accents, sans casse, mots entiers seulement", () => {
  assert.equal(fold("Côte d'Ivoire !"), " cote d ivoire ");
  assert.ok(containsTerm(fold("Attaque au Niger hier"), "Niger"));
  assert.equal(containsTerm(fold("Le Nigeria vote"), "Niger"), false, "« Niger » n'est pas un morceau de « Nigeria »");
  assert.ok(containsTerm(fold("coup d'État militaire"), "coup d'état"));
});

test("thème d'après le texte : le plus de mots l'emporte, sinon le repli de l'objectif", () => {
  assert.equal(themeOfText("Affrontements et frappes à la frontière", null, "politique"), "conflits");
  assert.equal(themeOfText("Choléra : des milliers de déplacés", null, "securite"), "humanitaire");
  assert.equal(themeOfText("Rien de particulier", null, "politique"), "politique");
});

test("noms de pays : français et anglais, sans doublon", () => {
  assert.deepEqual(countryNames("NGA")?.names, ["Nigeria"]);
  const ci = countryNames("CIV");
  assert.ok(ci && ci.names.length === 2 && ci.fr === "Côte d'Ivoire");
  assert.equal(countryNames("XXX"), null);
});

test("requêtes : pays + termes de l'objectif en deux langues, mots-clés et entités par petits groupes, plafond respecté", () => {
  const base = buildQueries(snapshot());
  assert.equal(base.length, 2, "une requête française, une anglaise (même nom de pays : pas de doublon de pays)");
  assert.ok(base.every((q) => q.query.includes("Nigeria") && q.query.endsWith("when:14d")));
  assert.ok(base[0].url.startsWith("https://news.google.com/rss/search?q=") && base[0].url.includes("hl=fr"));
  assert.ok(base[1].url.includes("hl=en-US"));
  const rich = buildQueries(snapshot({ keywords: ["Boko Haram", "ISWAP", "enlèvement", "pipeline", "bandits"], entities: ["Maiduguri"] }));
  assert.ok(rich.length > base.length && rich.length <= 10);
  assert.ok(rich.some((q) => q.query.includes('"Boko Haram"')), "un terme à espace est entre guillemets");
  const many = buildQueries(snapshot({ keywords: Array.from({ length: 80 }, (_, i) => `mot${i}`) }, ["NGA", "SDN", "MLI", "NER"]));
  assert.ok(many.length <= 10);
  assert.ok(many.every((q) => q.query.length <= 500));
  assert.deepEqual(buildQueries({ ...snapshot(), scope: { ...snapshot().scope, primaryZone: { kind: "circle", lat: 0, lon: 0, radiusKm: 50 } } }), []);
  assert.deepEqual(buildQueries(snapshot({}, ["XXX"])), []);
});

test("termes de requête : les caractères qui casseraient la syntaxe sont retirés", () => {
  assert.equal(queryTerm('a "b" (c)'), '"a b c"');
  assert.equal(queryTerm("simple"), "simple");
  assert.ok(googleNewsUrl("a b", "fr").includes("q=a%20b"));
});

test("adresse canonique : sans suivi, ancre ni barre finale ; la casse du chemin est conservée ; les autres schémas sont refusés", () => {
  assert.equal(canonicalItemUrl("https://News.Example.com/Article/42/?utm_source=x&id=7#top"), "https://news.example.com/Article/42?id=7");
  assert.equal(canonicalItemUrl("https://e.com/"), "https://e.com");
  for (const bad of ["", "pas une adresse", "javascript:alert(1)", "ftp://e.com/x"]) assert.equal(canonicalItemUrl(bad), null);
});

test("titre Google Actualités : l'éditeur est séparé du titre", () => {
  assert.deepEqual(splitGoogleNewsTitle("Attaque à Maiduguri - Le Monde"), { title: "Attaque à Maiduguri", publisher: "Le Monde" });
  assert.deepEqual(splitGoogleNewsTitle("Titre sans éditeur"), { title: "Titre sans éditeur", publisher: null });
  assert.equal(splitGoogleNewsTitle("a - " + "x".repeat(80)).publisher, null, "un « éditeur » interminable n'en est pas un");
});

test("normalisation : une publication valide est rangée avec son éditeur ; ce qui est inutilisable est écarté pour une raison nommée", () => {
  const ok = normalizeFeedItem(feedItem(), { kind: "gnews", now: NOW, maxAgeDays: 30 });
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.equal(ok.row.title, "Nigeria : attaque contre un convoi");
    assert.equal(ok.row.source_name, "Le Monde");
    assert.equal(ok.row.published_at, "2026-11-09T08:00:00.000Z");
    assert.equal(ok.row.excerpt, null);
  }
  const reasons = (patch: Partial<FeedItem>) => {
    const r = normalizeFeedItem(feedItem(patch), { kind: "gnews", now: NOW, maxAgeDays: 30 });
    return r.ok ? "ok" : r.reason;
  };
  assert.equal(reasons({ url: "" }), "no_url");
  assert.equal(reasons({ title: "  " }), "no_title");
  assert.equal(reasons({ publishedAt: null }), "no_date");
  assert.equal(reasons({ publishedAt: "2026-09-01T00:00:00Z" }), "too_old");
  assert.equal(reasons({ publishedAt: "2026-12-25T00:00:00Z" }), "future");
});

test("correspondance : cite le pays ET un terme de l'objectif, avec la raison écrite et un thème", () => {
  const verdict = matchItem({ title: "Nigeria : attaque contre un convoi militaire", excerpt: null }, snapshot());
  assert.ok(verdict.matched);
  assert.match(verdict.reason, /Cite « Nigeria » et : /);
  assert.ok(verdict.terms.includes("attaque"));
  assert.ok(verdict.score >= 2);
  assert.ok(["conflits", "securite"].includes(verdict.theme));
});

test("correspondance : un autre pays, un autre sujet ou une exclusion sont écartés, avec la raison", () => {
  assert.equal(matchItem({ title: "Attaque au Niger : trois morts", excerpt: null }, snapshot()).reason, "Ne cite aucun pays de la zone");
  assert.equal(matchItem({ title: "Le Nigeria remporte le match", excerpt: null }, snapshot()).reason, "Aucun terme de l'objectif");
  const excluded = matchItem({ title: "Nigeria : attaque contre un stade de football", excerpt: null }, snapshot(), ["football"]);
  assert.equal(excluded.matched, false);
  assert.match(excluded.reason, /Exclu/);
});

test("correspondance : avec des mots-clés choisis, seuls eux comptent (les termes génériques de l'objectif ne suffisent plus)", () => {
  const s = snapshot({ keywords: ["pipeline"], entities: ["Maiduguri"] });
  assert.equal(matchItem({ title: "Nigeria : attaque contre un convoi", excerpt: null }, s).matched, false);
  const hit = matchItem({ title: "Nigeria : un pipeline visé près de Maiduguri", excerpt: null }, s);
  assert.ok(hit.matched);
  assert.deepEqual(hit.terms, ["Maiduguri", "pipeline"], "entités d'abord, puis mots-clés");
  assert.equal(hit.score, 3 + 2);
});

test("correspondance : déterministe (même entrée, même verdict) et le thème de repli suit l'objectif", () => {
  const input = { title: "Nigeria : réforme du gouvernement", excerpt: "Le parlement vote." };
  const s = snapshot({ objective: "politique" });
  assert.deepEqual(matchItem(input, s), matchItem(input, s));
  assert.equal(matchItem(input, s).theme, "politique");
});

test("correspondance : un mot de sujet seul (« sécurité », « military ») ne suffit plus — il faut un fait ou un groupe armé", () => {
  const topicOnly = [
    "Nigeria : partenariat de sécurité renforcé avec le Royaume-Uni",
    "Nigeria Raises Military Pay up to 80% as Security Threats Persist",
    "Nigeria: Foundation advocates police reforms to ease military burden",
  ];
  for (const title of topicOnly) {
    const verdict = matchItem({ title, excerpt: null }, snapshot());
    assert.equal(verdict.matched, false, title);
    assert.match(verdict.reason, /^Sujet sans fait/);
    assert.equal(verdict.rejection, "topic");
  }
  const facts = [
    "Nigeria gunmen kill 10 relatives and abduct 13 in Zamfara",
    "Nigeria Rules Out Ceasefire With Boko Haram, ISWAP",
    "Nigeria : cinq soldats tués dans une embuscade",
    "Nigeria Records Fewer Security Incidents In October As Cult Violence Surges",
  ];
  for (const title of facts) assert.equal(matchItem({ title, excerpt: null }, snapshot()).matched, true, title);
  assert.equal(matchItem({ title: "Le groupe Lakurawa revendique le contrôle d'un secteur au Nigeria, selon l'armée", excerpt: null }, snapshot()).matched, true, "un groupe armé vaut un fait");
});

test("correspondance : « food security » et consorts sont hors-sujet pour la sécurité, mais pas pour l'humanitaire", () => {
  const hors = matchItem({ title: "Nigeria must turn climate promises into food security", excerpt: null }, snapshot());
  assert.equal(hors.matched, false);
  assert.match(hors.reason, /^Hors sujet : « food security »/);
  assert.equal(hors.rejection, "topic");
  assert.equal(matchItem({ title: "Nigeria : la famine menace, la sécurité alimentaire se dégrade", excerpt: null }, snapshot({ objective: "humanitaire" })).matched, true);
});

test("correspondance : un mot-clé choisi par l'utilisateur prime sur la règle des faits", () => {
  const s = snapshot({ keywords: ["partenariat"] });
  assert.equal(matchItem({ title: "Nigeria : partenariat de sécurité avec le Royaume-Uni", excerpt: null }, s).matched, true);
});
