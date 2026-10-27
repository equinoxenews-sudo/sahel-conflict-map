import assert from "node:assert/strict";
import test from "node:test";
import { plainExcerpt } from "../lib/rss";
import { decideJob, MODE_POLICIES } from "../lib/aiBudget";
import {
  MAX_PICKS,
  VEILLE_SOURCES,
  WINDOW_DAYS,
  buildPickPrompt,
  canonicalUrl,
  parsePicks,
  safeHttpUrl,
  selectCandidates,
  type Candidate,
} from "../lib/veilleOsint";

const NOW = new Date("2026-11-01T18:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

function candidate(n: number, extra: Partial<Candidate> = {}): Candidate {
  return {
    url: `https://exemple.org/article-${n}`,
    title: `Article ${n}`,
    excerpt: `Extrait ${n}`,
    imageUrl: null,
    publishedAt: daysAgo(1),
    sourceId: "a",
    sourceName: "Source A",
    ...extra,
  };
}

test("les quatre sources de départ ont un flux https et un identifiant unique", () => {
  assert.equal(VEILLE_SOURCES.length, 4);
  assert.equal(new Set(VEILLE_SOURCES.map((s) => s.id)).size, VEILLE_SOURCES.length);
  for (const source of VEILLE_SOURCES) assert.ok(source.feedUrl.startsWith("https://"), source.id);
});

test("l'adresse canonique retire les marques de suivi, l'ancre et la barre finale", () => {
  assert.equal(canonicalUrl("https://Exemple.org/a/?utm_source=x&id=3#haut"), "https://exemple.org/a?id=3");
  assert.equal(canonicalUrl("https://exemple.org/a/"), canonicalUrl("https://exemple.org/a?fbclid=zz"));
  assert.equal(canonicalUrl("pas une adresse"), "pas une adresse");
});

test("seules les adresses http(s) sont acceptées", () => {
  assert.equal(safeHttpUrl("https://exemple.org/x"), "https://exemple.org/x");
  assert.equal(safeHttpUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpUrl("data:text/html,x"), null);
  assert.equal(safeHttpUrl(""), null);
  assert.equal(safeHttpUrl(null), null);
});

test("les candidats : fenêtre de la semaine, pas de déjà publié, pas de doublon, plus récents d'abord", () => {
  const items = [
    candidate(1, { publishedAt: daysAgo(2) }),
    candidate(2, { publishedAt: daysAgo(WINDOW_DAYS + 3) }),
    candidate(3, { publishedAt: daysAgo(0.5) }),
    candidate(4, { url: "https://exemple.org/article-3?utm_source=rss", publishedAt: daysAgo(0.4) }),
    candidate(5, { publishedAt: "date illisible" }),
    candidate(6, { url: "ftp://exemple.org/x" }),
    candidate(7, { publishedAt: daysAgo(3) }),
  ];
  const out = selectCandidates(items, ["https://exemple.org/article-7/"], NOW);
  assert.deepEqual(
    out.map((c) => c.title),
    ["Article 4", "Article 1"],
  );
});

test("une source prolifique ne prend pas toute la place, et le total est borné", () => {
  const prolific = Array.from({ length: 12 }, (_, i) => candidate(i, { publishedAt: daysAgo(1 + i / 100) }));
  const others = ["b", "c", "d"].flatMap((id, s) =>
    Array.from({ length: 4 }, (_, i) => candidate(100 + s * 10 + i, { sourceId: id, sourceName: id, publishedAt: daysAgo(3 + i / 100) })),
  );
  const out = selectCandidates([...prolific, ...others], [], NOW);
  assert.equal(out.filter((c) => c.sourceId === "a").length, 5);
  assert.ok(out.length <= 14);
  assert.ok(out.some((c) => c.sourceId === "d"));
});

test("la consigne contient les articles numérotés, sans plus de 380 caractères d'extrait", () => {
  const prompt = buildPickPrompt([candidate(1, { excerpt: "x".repeat(2000) }), candidate(2)]);
  assert.ok(prompt.includes('"id":1') && prompt.includes('"id":2'));
  assert.ok(!prompt.includes("x".repeat(381)));
  assert.ok(prompt.includes(`au plus ${MAX_PICKS} articles`));
});

test("la réponse du modèle est vérifiée : numéro connu, textes non vides, pas de doublon, plafond respecté", () => {
  const list = Array.from({ length: 8 }, (_, i) => candidate(i + 1));
  const reply = `Voici : \`\`\`json ${JSON.stringify([
    { id: 1, titre: "« Un titre »", resume: "Un résumé." },
    { id: 1, titre: "Doublon", resume: "Doublon." },
    { id: 99, titre: "Inconnu", resume: "Inconnu." },
    { id: 2, titre: "", resume: "Sans titre." },
    { id: 3, titre: "Trop long " + "a".repeat(300), resume: "R".repeat(500) },
    { id: "4", titre: "Id texte", resume: "Non." },
    ...[4, 5, 6, 7, 8].map((id) => ({ id, titre: `T${id}`, resume: `R${id}` })),
  ])} \`\`\``;
  const picks = parsePicks(reply, list);
  assert.equal(picks.length, MAX_PICKS);
  assert.equal(picks[0].titleFr, "Un titre");
  assert.equal(picks[0].candidate.url, list[0].url);
  assert.ok(picks[1].titleFr.length <= 130 && picks[1].summaryFr.length <= 320);
  assert.equal(new Set(picks.map((p) => p.candidate.url)).size, picks.length);
});

test("une réponse sans tableau JSON est refusée ; un tableau vide donne aucune publication", () => {
  assert.throws(() => parsePicks("désolé, rien à signaler", [candidate(1)]));
  assert.deepEqual(parsePicks("[]", [candidate(1)]), []);
});

test("l'extrait d'un flux est réduit en texte brut et coupé au dernier mot", () => {
  assert.equal(plainExcerpt("<p>Bonjour&nbsp;<b>le</b> monde &amp; tous</p><script>alert(1)</script>"), "Bonjour le monde & tous");
  const long = plainExcerpt(`<p>${"mot ".repeat(400)}</p>`, 100);
  assert.ok(long.length <= 101 && long.endsWith("…"));
});

test("la veille hebdomadaire n'est suspendue que lorsque le budget du mois est épuisé", () => {
  const now = new Date("2026-11-01T18:00:00Z");
  assert.equal(decideJob("veille-osint", MODE_POLICIES.normal, now).allowed, true);
  assert.equal(decideJob("veille-osint", MODE_POLICIES.critical, now).allowed, true);
  assert.equal(decideJob("veille-osint", MODE_POLICIES.exhausted, now).allowed, false);
});
