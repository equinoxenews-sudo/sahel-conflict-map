import test from "node:test";
import assert from "node:assert/strict";
import { buildSynthesisPrompt, extractFromBlocks, fingerprintOf, parseSynthesis, type InputBrief } from "../lib/zoneSynthesis";

const valid = { headline: "Situation tendue.", sections: [{ heading: "Sécurité", body: "Selon la BBC, des combats ont eu lieu." }] };

test("Le JSON final est retrouvé après des commentaires de recherche et des balises markdown", () => {
 const text = `Je vais chercher des informations.\n\`\`\`json\n${JSON.stringify(valid)}\n\`\`\``;
 assert.deepEqual(parseSynthesis(text), valid);
});

test("Une synthèse mal formée est refusée", () => {
 assert.throws(() => parseSynthesis("pas de json"));
 assert.throws(() => parseSynthesis(JSON.stringify({ headline: "", sections: valid.sections })));
 assert.throws(() => parseSynthesis(JSON.stringify({ headline: "x", sections: [] })));
 assert.throws(() => parseSynthesis(JSON.stringify({ headline: "x", sections: [{ heading: "A", body: "  " }] })));
 assert.throws(() => parseSynthesis(JSON.stringify({ headline: "x", sections: [{ heading: "A" }] })));
});

test("L'empreinte ne dépend pas de l'ordre mais change si une synthèse est mise à jour", () => {
 const a = { id: 1, updated_at: "2026-10-04T05:00:00Z" };
 const b = { id: 2, updated_at: "2026-10-04T06:00:00Z" };
 assert.equal(fingerprintOf([a, b]), fingerprintOf([b, a]));
 assert.notEqual(fingerprintOf([a, b]), fingerprintOf([a, { ...b, updated_at: "2026-10-04T07:00:00Z" }]));
 assert.notEqual(fingerprintOf([a]), fingerprintOf([a, b]));
});

test("Seul le texte final est gardé et les sources citées priment sur les sources consultées", () => {
 const blocks = [
  { type: "text", text: "Je cherche." },
  { type: "server_tool_use" },
  { type: "web_search_tool_result", content: [
   { type: "web_search_result", url: "https://www.bbc.com/a", title: "A" },
   { type: "web_search_result", url: "https://www.dw.com/b", title: "B" },
  ] },
  { type: "text", text: JSON.stringify(valid), citations: [{ url: "https://www.bbc.com/a", title: "A" }, { url: "https://www.bbc.com/a", title: "A" }] },
 ];
 const out = extractFromBlocks(blocks);
 assert.deepEqual(parseSynthesis(out.text), valid);
 assert.deepEqual(out.sources.map((s) => s.domain), ["bbc.com"]);
 assert.equal(out.usedWebSearch, true);
});

test("Sans recherche web : pas de sources ni d'usage du web", () => {
 const out = extractFromBlocks([{ type: "text", text: JSON.stringify(valid) }]);
 assert.deepEqual(out.sources, []);
 assert.equal(out.usedWebSearch, false);
});

test("Un résultat de recherche en erreur ne compte pas comme usage du web", () => {
 const out = extractFromBlocks([
  { type: "web_search_tool_result", content: { type: "web_search_tool_result_error", error_code: "unavailable" } },
  { type: "text", text: JSON.stringify(valid) },
 ]);
 assert.equal(out.usedWebSearch, false);
});

test("Le prompt reprend le statut de véracité et signale l'absence de web", () => {
 const brief: InputBrief = { id: 7, title: "Frappe", summary: "Résumé", veracity: "Revendiqué", importance: "high", category: null, primary_theme: "conflicts", source_domains: ["bbc.com"], updated_at: null };
 const withoutWeb = buildSynthesisPrompt("Afrique", [brief], "lundi", false);
 assert.match(withoutWeb, /\[#7\] \[Revendiqué · Conflits & opérations militaires · importance high\]/);
 assert.match(withoutWeb, /Aucun accès au web/);
 assert.doesNotMatch(buildSynthesisPrompt("Afrique", [brief], "lundi", true), /Aucun accès au web/);
});
