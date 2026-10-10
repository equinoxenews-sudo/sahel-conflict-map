import assert from "node:assert/strict";
import test from "node:test";
import {
  addUsage,
  budgetLevel,
  decideWebSearch,
  estimateCostUsd,
  jobAllowed,
  limitsFromEnv,
  shouldGenerateBriefs,
  usageFromResponse,
  webPolicyFromEnv,
  zoneForWeekday,
} from "../lib/aiBudget";

test("Coût estimé : jetons d'entrée, de sortie et recherches web", () => {
  const cost = estimateCostUsd({ inputTokens: 1_000_000, outputTokens: 1_000_000, webSearches: 1000 });
  assert.equal(cost, 1 + 5 + 10);
  assert.ok(Math.abs(estimateCostUsd({ inputTokens: 6000, outputTokens: 3000, webSearches: 0 }) - 0.021) < 1e-9);
});

test("L'utilisation est lue dans la réponse de l'API, valeurs absentes à zéro", () => {
  const usage = usageFromResponse({ usage: { input_tokens: 120, output_tokens: 80, server_tool_use: { web_search_requests: 2 } } });
  assert.deepEqual(usage, { inputTokens: 120, outputTokens: 80, webSearches: 2 });
  assert.deepEqual(usageFromResponse({}), { inputTokens: 0, outputTokens: 0, webSearches: 0 });
  assert.deepEqual(addUsage(usage, usage), { inputTokens: 240, outputTokens: 160, webSearches: 4 });
});

test("Seuils : avertissement à 3 $, suspension à 5 $, arrêt total à 8 $", () => {
  const limits = limitsFromEnv({});
  assert.deepEqual(limits, { warn: 3, stop: 5, hard: 8 });
  assert.equal(budgetLevel(2.99, limits), "ok");
  assert.equal(budgetLevel(3, limits), "warn");
  assert.equal(budgetLevel(5, limits), "stop");
  assert.equal(budgetLevel(8, limits), "hard");
  assert.deepEqual(limitsFromEnv({ AI_BUDGET_STOP_USD: "10" }), { warn: 3, stop: 10, hard: 8 });
});

test("Au seuil de suspension, seules les synthèses du jour continuent", () => {
  assert.equal(jobAllowed("zone-synthesis", "warn"), true);
  assert.equal(jobAllowed("zone-synthesis", "stop"), false);
  assert.equal(jobAllowed("situation-report", "stop"), false);
  assert.equal(jobAllowed("sync-briefs", "stop"), true);
  assert.equal(jobAllowed("sync-briefs", "hard"), false);
});

test("Rotation : une zone par jour, rien le lundi ni le dimanche", () => {
  assert.equal(zoneForWeekday(2), "europe");
  assert.equal(zoneForWeekday(3), "moyen-orient");
  assert.equal(zoneForWeekday(4), "afrique");
  assert.equal(zoneForWeekday(5), "indopacifique");
  assert.equal(zoneForWeekday(6), "amerique-du-sud");
  assert.equal(zoneForWeekday(1), null);
  assert.equal(zoneForWeekday(0), null);
});

test("Recherche web : désactivée par défaut, même pour une information importante", () => {
  const brief = { importance: "high", veracity: "Possible", source_domains: ["bbc.com"] };
  assert.equal(decideWebSearch([brief], 0).allowed, false);
});

test("Recherche web : permise seulement pour une information importante à vérifier, dans le plafond", () => {
  const policy = { perRun: 3, monthlyCap: 10 };
  const unsettled = { importance: "high", veracity: "Revendiqué", source_domains: ["a.com", "b.com"] };
  const settled = { importance: "high", veracity: "Confirmé", source_domains: ["a.com", "b.com"] };
  const single = { importance: "high", veracity: "Confirmé", source_domains: ["a.com"] };
  const minor = { importance: "low", veracity: "Non confirmé", source_domains: ["a.com"] };
  assert.equal(decideWebSearch([unsettled], 0, policy).allowed, true);
  assert.equal(decideWebSearch([single], 0, policy).allowed, true);
  assert.equal(decideWebSearch([settled], 0, policy).allowed, false);
  assert.equal(decideWebSearch([minor], 0, policy).allowed, false);
  // Le plafond mensuel réduit le nombre de recherches puis les interdit.
  assert.equal(decideWebSearch([unsettled], 8, policy).maxUses, 2);
  assert.equal(decideWebSearch([unsettled], 10, policy).allowed, false);
  assert.deepEqual(webPolicyFromEnv({}), { perRun: 3, monthlyCap: 0 });
});

const NOW = new Date("2026-10-12T06:00:00Z");
const ago = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString();

test("Génération : rien en attente, rien à faire", () => {
  assert.equal(shouldGenerateBriefs([], NOW).generate, false);
});

test("Génération : un lot mince et récent est reporté, un lot suffisant déclenche", () => {
  const few = [{ title: "Réunion ministérielle à Bamako", publishedAt: ago(5) }, { title: "Marché de Niamey", publishedAt: ago(8) }];
  assert.equal(shouldGenerateBriefs(few, NOW).generate, false);
  const enough = [...few, { title: "Visite du président", publishedAt: ago(3) }];
  assert.equal(shouldGenerateBriefs(enough, NOW).generate, true);
});

test("Génération : un événement majeur ou une attente trop longue déclenche malgré le petit lot", () => {
  assert.equal(shouldGenerateBriefs([{ title: "Attentat à Ouagadougou : plusieurs morts", publishedAt: ago(1) }], NOW).generate, true);
  assert.equal(shouldGenerateBriefs([{ title: "Visite du ministre", publishedAt: ago(40) }], NOW).generate, true);
});
