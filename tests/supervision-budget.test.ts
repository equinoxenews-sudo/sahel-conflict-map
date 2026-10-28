import assert from "node:assert/strict";
import test from "node:test";
import { decideSpend, maxCallCostUsd, monthlyCapUsd, monthStart, usdPerEur } from "../lib/supervision/budget";
import { buildDailyPrompt, parseDailyReport, selectForSynthesis, todayIn } from "../lib/supervision/synthesis";
import type { ResultItem } from "../lib/supervision/results";

const item = (id: number, extra: Partial<ResultItem> = {}): ResultItem => ({
  id,
  url: `https://exemple.org/${id}`,
  title: `Titre ${id}`,
  excerpt: `Extrait ${id}`,
  sourceKind: "rss",
  sourceName: "exemple.org",
  publishedAt: "2026-11-01T08:00:00Z",
  latitude: null,
  longitude: null,
  geoPrecision: null,
  geoPlace: null,
  score: 2,
  reason: null,
  feedback: null,
  ...extra,
});

test("le plafond mensuel en dollars suit le prix de l'offre, avec une marge de sécurité", () => {
  // Intelligence : 1,999 € × 1,15 $/€ × 0,95 ≈ 2,1839 $.
  assert.equal(monthlyCapUsd("intelligence", 1.15), 2.18391);
  assert.ok((monthlyCapUsd("pro", 1.15) ?? 0) > 5);
  assert.ok((monthlyCapUsd("plus", 1.15) ?? 0) < 1);
  assert.equal(monthlyCapUsd("owner"), null);
  assert.equal(monthlyCapUsd("enterprise"), null);
  assert.equal(usdPerEur({ AI_USD_PER_EUR: "1.2" }), 1.2);
  assert.equal(usdPerEur({ AI_USD_PER_EUR: "abc" }), 1.15);
});

test("un appel n'est autorisé que si son coût maximal tient sous le plafond", () => {
  assert.deepEqual(decideSpend({ capUsd: 2, spentUsd: 1.5, estimateUsd: 0.4 }), { allowed: true });
  const refused = decideSpend({ capUsd: 2, spentUsd: 1.9, estimateUsd: 0.2 });
  assert.equal(refused.allowed, false);
  assert.deepEqual(decideSpend({ capUsd: null, spentUsd: 999, estimateUsd: 5 }), { allowed: true });
});

test("le coût maximal d'un appel suit le tarif du modèle (Haiku 4.5 : 1 $ / 5 $ le million)", () => {
  const cost = maxCallCostUsd("claude-haiku-4-5-20251001", 7_000, 900, {});
  // 2 000 jetons d'entrée + 900 de sortie ≈ 0,002 + 0,0045 $.
  assert.ok(Math.abs(cost - 0.0065) < 0.0005);
});

test("le mois de facturation commence le premier du mois (UTC)", () => {
  assert.equal(monthStart(new Date("2026-11-17T10:00:00Z")), "2026-11-01T00:00:00.000Z");
});

test("le jour est calculé dans le fuseau du compte", () => {
  assert.equal(todayIn("Europe/Paris", new Date("2026-11-01T23:30:00Z")), "2026-11-02");
  assert.equal(todayIn("America/New_York", new Date("2026-11-01T23:30:00Z")), "2026-11-01");
  assert.equal(todayIn("Fuseau/Inconnu", new Date("2026-11-01T10:00:00Z")), "2026-11-01");
});

test("la consigne contient les publications numérotées, la zone et l'interdiction d'inventer", () => {
  const prompt = buildDailyPrompt({ name: "El Fasher", userRequest: "Sécurité", zone: { kind: "circle", lat: 13.63, lon: 25.35, radiusKm: 150 } }, [item(7, { excerpt: "x".repeat(2000) })]);
  assert.ok(prompt.includes('"id":7'));
  assert.ok(!prompt.includes("x".repeat(321)));
  assert.ok(prompt.includes("UNIQUEMENT"));
  assert.ok(prompt.includes("150 km"));
});

test("les publications les mieux classées passent en premier, puis les plus récentes", () => {
  const picked = selectForSynthesis([item(1, { score: 1 }), item(2, { score: 5 }), item(3, { score: 5, publishedAt: "2026-11-01T12:00:00Z" })], 2);
  assert.deepEqual(picked.map((entry) => entry.id), [3, 2]);
});

test("la réponse du modèle est vérifiée : identifiants connus, points sans source écartés", () => {
  const ids = new Set([1, 2, 3]);
  const reply = `Voici : ${JSON.stringify({
    resume: "Des combats sont rapportés.",
    points: [
      { texte: "Combats signalés par exemple.org", ids: [1, 99], nature: "fait" },
      { texte: "Sans source", ids: [99], nature: "fait" },
      { texte: "Lecture prudente", ids: [2, 3], nature: "hypothese" },
      { texte: "", ids: [1] },
    ],
    incertitudes: ["Une seule source."],
  })}`;
  const report = parseDailyReport(reply, ids);
  assert.ok(report);
  assert.equal(report.points.length, 2);
  assert.deepEqual(report.points[0].itemIds, [1]);
  assert.equal(report.points[1].kind, "hypothese");
  assert.deepEqual(report.uncertainties, ["Une seule source."]);
});

test("une réponse sans résumé, sans point valide ou sans JSON est refusée", () => {
  const ids = new Set([1]);
  assert.equal(parseDailyReport("désolé", ids), null);
  assert.equal(parseDailyReport(JSON.stringify({ resume: "", points: [{ texte: "x", ids: [1] }] }), ids), null);
  assert.equal(parseDailyReport(JSON.stringify({ resume: "ok", points: [{ texte: "x", ids: [42] }] }), ids), null);
});
