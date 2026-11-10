import assert from "node:assert/strict";
import test from "node:test";
import { matchItem } from "../lib/supervision/collect/match";
import { buildQueries } from "../lib/supervision/collect/queries";
import type { ScopeSnapshot } from "../lib/supervision/core/majorChange";
import { classifyScopeChange } from "../lib/supervision/core/majorChange";
import { DEFAULT_POLICY } from "../lib/supervision/core/policy";
import { COUNTRIES_MAX, TERMS_MAX, applyScopeEdit, editOf, isUnchanged, validateScopeEdit } from "../lib/supervision/core/scopeEdit";

const base: ScopeSnapshot = {
  scope: { primaryZone: { kind: "countries", codes: ["NGA"] }, objective: "securite", countries: ["NGA"], sources: ["rss-x"], keywords: [], entities: [] },
  estimate: { volumePerMonth: 1000, volumeConfidence: "estimated", aiCostUsdPerMonth: 5, costConfidence: "estimated" },
};

test("validation : un périmètre correct est accepté et normalisé (espaces, doublons sans tenir compte de la casse ni des accents)", () => {
  const out = validateScopeEdit({
    countries: ["nga", " NGA ", "mli"],
    objective: "securite",
    keywords: ["  enlèvement  ", "Enlevement", "pipeline   nord"],
    entities: ["Boko Haram"],
    exclusions: ["football"],
  });
  assert.ok(out.ok, JSON.stringify(out));
  if (!out.ok) return;
  assert.deepEqual(out.value.countries, ["NGA", "MLI"]);
  assert.deepEqual(out.value.keywords, ["enlèvement", "pipeline nord"], "« Enlevement » est le même terme qu'« enlèvement »");
  assert.deepEqual(out.value.entities, ["Boko Haram"]);
  assert.deepEqual(out.value.exclusions, ["football"]);
});

test("validation : pays inconnu, aucun pays, trop de pays, objectif inconnu sont refusés avec un message", () => {
  const unknown = validateScopeEdit({ countries: ["ZZZ"], objective: "securite" });
  assert.ok(!unknown.ok && unknown.errors.some((e) => /Pays inconnu/.test(e)));
  const none = validateScopeEdit({ countries: [], objective: "securite" });
  assert.ok(!none.ok && none.errors.some((e) => /au moins un pays/.test(e)));
  const many = validateScopeEdit({ countries: ["NGA", "MLI", "NER", "TCD", "SDN", "ETH"].slice(0, COUNTRIES_MAX + 1), objective: "securite" });
  assert.ok(!many.ok && many.errors.some((e) => new RegExp(`${COUNTRIES_MAX} pays au maximum`).test(e)));
  const objective = validateScopeEdit({ countries: ["NGA"], objective: "astrologie" });
  assert.ok(!objective.ok && objective.errors.includes("Objectif inconnu."));
  assert.ok(!validateScopeEdit(null).ok, "un corps vide est refusé, jamais accepté par défaut");
});

test("validation : termes trop courts ou trop longs, trop nombreux, ou de mauvais type sont refusés ; les vides sont ignorés", () => {
  const short = validateScopeEdit({ countries: ["NGA"], objective: "securite", keywords: ["a"] });
  assert.ok(!short.ok && short.errors.some((e) => /Mots-clés/.test(e)));
  const long = validateScopeEdit({ countries: ["NGA"], objective: "securite", entities: ["x".repeat(61)] });
  assert.ok(!long.ok && long.errors.some((e) => /Entités/.test(e)));
  const tooMany = validateScopeEdit({ countries: ["NGA"], objective: "securite", exclusions: Array.from({ length: TERMS_MAX + 1 }, (_, i) => `terme${i}x`) });
  assert.ok(!tooMany.ok && tooMany.errors.some((e) => /Exclusions/.test(e)));
  const wrongType = validateScopeEdit({ countries: ["NGA"], objective: "securite", keywords: [42] });
  assert.ok(!wrongType.ok);
  const notList = validateScopeEdit({ countries: ["NGA"], objective: "securite", keywords: "pipeline" });
  assert.ok(!notList.ok);
  const blanks = validateScopeEdit({ countries: ["NGA"], objective: "securite", keywords: ["", "   ", "pipeline"] });
  assert.ok(blanks.ok && blanks.value.keywords.length === 1);
  const control = validateScopeEdit({ countries: ["NGA"], objective: "securite", keywords: ["pipe\u0000line\nnord"] });
  assert.ok(control.ok && control.value.keywords[0] === "pipe line nord", "les caractères de contrôle ne passent pas");
});

test("application : remplace pays, objectif et listes, conserve les sources et l'estimation ; l'ancien périmètre n'est pas modifié", () => {
  const edit = { countries: ["NGA", "NER"], objective: "politique", keywords: ["élection"], entities: ["INEC"], exclusions: ["football"] };
  const next = applyScopeEdit(base, edit);
  assert.deepEqual(next.scope.primaryZone, { kind: "countries", codes: ["NGA", "NER"] });
  assert.deepEqual(next.scope.countries, ["NGA", "NER"]);
  assert.equal(next.scope.objective, "politique");
  assert.deepEqual(next.scope.exclusions, ["football"]);
  assert.deepEqual(next.scope.sources, ["rss-x"], "les sources ne sont pas gérées par cet écran : conservées");
  assert.equal(next.estimate, base.estimate);
  assert.deepEqual(base.scope.keywords, [], "l'ancienne version reste intacte");
  next.scope.keywords.push("autre");
  assert.deepEqual(edit.keywords, ["élection"], "pas de partage de listes entre l'édition et le résultat");
});

test("aucun changement : une édition identique est détectée (le serveur n'enregistre alors aucune version)", () => {
  assert.equal(isUnchanged(base, editOf(base)), true);
  assert.equal(isUnchanged(base, { ...editOf(base), keywords: ["pipeline"] }), false);
  assert.equal(isUnchanged(base, { ...editOf(base), exclusions: ["football"] }), false);
  assert.equal(isUnchanged(base, { ...editOf(base), objective: "economie" }), false);
  assert.deepEqual(editOf(base).exclusions, [], "une ancienne version sans exclusions se lit comme « aucune »");
});

test("effet sur la collecte : les exclusions du périmètre écartent, les mots-clés remplacent le vocabulaire par défaut, et les requêtes suivent", () => {
  const next = applyScopeEdit(base, { countries: ["NGA"], objective: "securite", keywords: ["pipeline"], entities: ["Maiduguri"], exclusions: ["football"] });
  assert.equal(matchItem({ title: "Nigeria : attaque contre un stade de football", excerpt: null }, next).matched, false);
  assert.match(matchItem({ title: "Nigeria : attaque contre un stade de football", excerpt: null }, next).reason, /Exclu/);
  assert.equal(matchItem({ title: "Nigeria : attaque contre un convoi", excerpt: null }, next).matched, false, "mots-clés choisis : le vocabulaire générique ne suffit plus");
  assert.equal(matchItem({ title: "Nigeria : un pipeline visé près de Maiduguri", excerpt: null }, next).matched, true);
  const queries = buildQueries(next).map((q) => q.query);
  assert.ok(queries.some((q) => q.includes("pipeline")) && queries.some((q) => q.includes("Maiduguri")), queries.join(" | "));
});

test("classification : ajouter une exclusion n'est jamais un élargissement ; ajouter un mot-clé sans estimation fiable l'est (le serveur le dira avant d'enregistrer)", () => {
  const unknown: ScopeSnapshot = { ...base, estimate: { volumePerMonth: null, volumeConfidence: "unknown", aiCostUsdPerMonth: null, costConfidence: "unknown" } };
  const narrowed = classifyScopeChange(unknown, applyScopeEdit(unknown, { ...editOf(unknown), exclusions: ["football"] }), DEFAULT_POLICY.majorChange);
  assert.equal(narrowed.major, false);
  assert.deepEqual(narrowed.warnings, []);
  const widened = classifyScopeChange(unknown, applyScopeEdit(unknown, { ...editOf(unknown), keywords: ["pipeline"] }), DEFAULT_POLICY.majorChange);
  assert.equal(widened.major, true, "estimation inconnue + élargissement = majeur (règle de prudence validée)");
  assert.ok(widened.warnings.includes("volume_estimate_unreliable"));
});
