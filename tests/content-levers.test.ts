import assert from "node:assert/strict";
import test from "node:test";
import { directiveKeywords, directivePrompt, matchesDirective, prioritize } from "../lib/zoneDirectives";

test("consigne du jour : mots-clés significatifs", () => {
  const k = directiveKeywords("Attention particulière aujourd'hui sur les émeutes en France, les villes touchées et ce qui a été détruit");
  assert.ok(k.includes("emeutes"));
  assert.ok(k.includes("france"));
  assert.ok(!k.includes("attention"));
  assert.ok(!k.includes("aujourd"));
});

test("consigne du jour : les sources concernées passent en tête", () => {
  const k = directiveKeywords("émeutes en France");
  const titles = ["Ukraine : frappe sur Kharkiv", "Nouvelle nuit d'émeute à Lyon", "Allemagne : élections", "France : bilan des violences urbaines"];
  assert.deepEqual(prioritize(titles, (t) => t, k), [titles[1], titles[3], titles[0], titles[2]]);
  assert.equal(matchesDirective("Ukraine : frappe", k), false);
  assert.deepEqual(prioritize(titles, (t) => t, []), titles);
});

test("consigne du jour : bloc de prompt vide sans consigne", () => {
  assert.equal(directivePrompt(null), "");
  assert.match(directivePrompt({ text: "Priorité aux émeutes", activeUntil: "2026-10-18T22:00:00Z" }), /Priorité aux émeutes/);
});
