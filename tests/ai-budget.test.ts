import assert from "node:assert/strict";
import test from "node:test";
import {
  addUsage,
  budgetMode,
  decideJob,
  decideWebSearch,
  estimateCostUsd,
  estimateInputTokens,
  meetsImportance,
  MODE_POLICIES,
  monthlyBudgetFromEnv,
  projectMonthUsd,
  rulesForMode,
  shouldGenerateBriefs,
  usageFromResponse,
  webPolicyFromEnv,
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

// Budget : 40 € hors taxes ≈ 46 $ de crédits. On juge le rythme de la dépense, pas un chiffre atteint.
const BUDGET = 46;
const EUR = 1.15; // dollars par euro, taux de référence du budget

test("Budget mensuel : 46 $ par défaut, réglable par AI_BUDGET_MONTHLY_USD", () => {
  assert.equal(monthlyBudgetFromEnv({}), 46);
  assert.equal(monthlyBudgetFromEnv({ AI_BUDGET_MONTHLY_USD: "60" }), 60);
  assert.equal(monthlyBudgetFromEnv({ AI_BUDGET_MONTHLY_USD: "abc" }), 46);
  assert.equal(monthlyBudgetFromEnv({ AI_BUDGET_MONTHLY_USD: "0" }), 46);
});

test("Projection : déjà dépensé + rythme des 7 derniers jours × jours restants", () => {
  // 7 jours à 1,2 $ par jour, 23e jour d'un mois de 31 jours
  assert.ok(Math.abs(projectMonthUsd({ spentUsd: 28.75, recentUsd: 8.4, dayOfMonth: 23, daysInMonth: 31 }) - (28.75 + 1.2 * 8)) < 1e-9);
  // en début de mois, la fenêtre est celle des jours écoulés
  assert.equal(projectMonthUsd({ spentUsd: 10, recentUsd: 10, dayOfMonth: 4, daysInMonth: 30 }), 10 + 2.5 * 26);
  // dernier jour du mois : rien ne s'ajoute
  assert.equal(projectMonthUsd({ spentUsd: 20, recentUsd: 7, dayOfMonth: 30, daysInMonth: 30 }), 20);
});

test("25 € dépensés le 23 du mois : tout va bien, aucune restriction", () => {
  const spentUsd = 25 * EUR;
  const projectedUsd = projectMonthUsd({ spentUsd, recentUsd: 7 * 1.2 * EUR, dayOfMonth: 23, daysInMonth: 31 });
  assert.equal(budgetMode({ spentUsd, projectedUsd, dayOfMonth: 23, budgetUsd: BUDGET }), "normal");
});

test("10 € dépensés en 4 jours : mode critique tout de suite", () => {
  const spentUsd = 10 * EUR;
  const projectedUsd = projectMonthUsd({ spentUsd, recentUsd: spentUsd, dayOfMonth: 4, daysInMonth: 31 });
  assert.equal(budgetMode({ spentUsd, projectedUsd, dayOfMonth: 4, budgetUsd: BUDGET }), "critical");
});

test("Jusqu'au budget : normal ; de 100 % à 140 % : tendu ; au-delà de 140 % : critique", () => {
  const mode = (projectedUsd: number) => budgetMode({ spentUsd: 10, projectedUsd, dayOfMonth: 15, budgetUsd: BUDGET });
  assert.equal(mode(46), "normal");
  assert.equal(mode(46.5), "tight");
  assert.equal(mode(64), "tight");
  assert.equal(mode(65), "critical");
});

test("Avant le 3e jour du mois, pas de jugement ; budget presque épuisé : dernier recours", () => {
  assert.equal(budgetMode({ spentUsd: 3, projectedUsd: 500, dayOfMonth: 2, budgetUsd: BUDGET }), "normal");
  assert.equal(budgetMode({ spentUsd: 3, projectedUsd: 500, dayOfMonth: 3, budgetUsd: BUDGET }), "critical");
  assert.equal(budgetMode({ spentUsd: 0.95 * BUDGET, projectedUsd: 47, dayOfMonth: 28, budgetUsd: BUDGET }), "exhausted");
  assert.equal(budgetMode({ spentUsd: 0.95 * BUDGET, projectedUsd: 47, dayOfMonth: 1, budgetUsd: BUDGET }), "exhausted");
});

test("Articles : seuils relevés, moins de lots, importance minimale selon le mode", () => {
  assert.deepEqual(MODE_POLICIES.normal.articles, { minNew: 3, maxAgeHours: 36, maxBatches: 3, minImportance: "low" });
  assert.deepEqual(MODE_POLICIES.tight.articles, { minNew: 4, maxAgeHours: 48, maxBatches: 2, minImportance: "medium" });
  assert.deepEqual(MODE_POLICIES.critical.articles, { minNew: 5, maxAgeHours: 72, maxBatches: 1, minImportance: "high" });
  assert.equal(meetsImportance("high", "high"), true);
  assert.equal(meetsImportance("medium", "high"), false);
  assert.equal(meetsImportance("medium", "medium"), true);
  assert.equal(meetsImportance("low", "medium"), false);
  assert.equal(meetsImportance(null, "medium"), true);
  assert.equal(meetsImportance("low", "low"), true);
});

test("Les règles de génération ne sont jamais abaissées par le mode, et un événement grave passe toujours", () => {
  const base = { minNew: 3, maxAgeHours: 36 };
  assert.deepEqual(rulesForMode(base, MODE_POLICIES.normal), base);
  assert.deepEqual(rulesForMode(base, MODE_POLICIES.critical), { minNew: 5, maxAgeHours: 72 });
  assert.deepEqual(rulesForMode({ minNew: 9, maxAgeHours: 100 }, MODE_POLICIES.tight), { minNew: 9, maxAgeHours: 100 });
  const now = new Date("2026-10-22T06:00:00Z");
  const four = Array.from({ length: 4 }, (_, i) => ({ title: `Visite ${i}`, publishedAt: now.toISOString() }));
  assert.equal(shouldGenerateBriefs(four, now, rulesForMode(base, MODE_POLICIES.critical)).generate, false);
  assert.equal(shouldGenerateBriefs(four, now, rulesForMode(base, MODE_POLICIES.normal)).generate, true);
  assert.equal(shouldGenerateBriefs([{ title: "Attentat à Niamey", publishedAt: now.toISOString() }], now, rulesForMode(base, MODE_POLICIES.exhausted)).generate, true);
});

test("Points de situation : lundi et jeudi sauf en critique (lundi seul) et budget épuisé", () => {
  const monday = new Date("2026-10-19T05:00:00Z");
  const thursday = new Date("2026-10-22T05:00:00Z");
  const tuesday = new Date("2026-10-20T05:00:00Z");
  for (const mode of ["normal", "tight"] as const) {
    assert.equal(decideJob("situation-report", MODE_POLICIES[mode], monday).allowed, true);
    assert.equal(decideJob("situation-report", MODE_POLICIES[mode], thursday).allowed, true);
    // un lancement manuel un autre jour reste possible : le rythme est celui du planificateur
    assert.equal(decideJob("situation-report", MODE_POLICIES[mode], tuesday).allowed, true);
  }
  assert.equal(decideJob("situation-report", MODE_POLICIES.critical, monday).allowed, true);
  assert.equal(decideJob("situation-report", MODE_POLICIES.critical, thursday).allowed, false);
  assert.equal(decideJob("situation-report", MODE_POLICIES.exhausted, monday).allowed, false);
});

test("Synthèses de zone : tous les jours en normal, tous les 3 jours en tendu et en critique", () => {
  const now = new Date("2026-10-22T08:00:00Z");
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);
  assert.equal(decideJob("zone-synthesis", MODE_POLICIES.normal, now, hoursAgo(24)).allowed, true);
  for (const mode of ["tight", "critical"] as const) {
    assert.equal(decideJob("zone-synthesis", MODE_POLICIES[mode], now, hoursAgo(24)).allowed, false);
    assert.equal(decideJob("zone-synthesis", MODE_POLICIES[mode], now, hoursAgo(48)).allowed, false);
    // trois jours à l'heure près : le cron de Vercel part à ±59 min
    assert.equal(decideJob("zone-synthesis", MODE_POLICIES[mode], now, hoursAgo(71)).allowed, true);
    assert.equal(decideJob("zone-synthesis", MODE_POLICIES[mode], now, hoursAgo(80)).allowed, true);
    assert.equal(decideJob("zone-synthesis", MODE_POLICIES[mode], now, null).allowed, true);
  }
  assert.equal(decideJob("zone-synthesis", MODE_POLICIES.exhausted, now, null).allowed, false);
});

test("Les articles tournent dans tous les modes", () => {
  const now = new Date("2026-10-22T06:00:00Z");
  for (const mode of ["normal", "tight", "critical", "exhausted"] as const) {
    assert.equal(decideJob("sync-briefs", MODE_POLICIES[mode], now).allowed, true);
  }
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

test("Coût estimé au tarif du modèle réellement utilisé", async () => {
  const { pricingFromEnv } = await import("../lib/aiBudget");
  const usage = { inputTokens: 1_000_000, outputTokens: 1_000_000, webSearches: 0 };
  assert.equal(estimateCostUsd(usage, pricingFromEnv({}, "claude-opus-5-5")), 24);
  assert.equal(estimateCostUsd(usage, pricingFromEnv({}, "claude-sonnet-5-5")), 12);
  assert.equal(estimateCostUsd(usage, pricingFromEnv({}, "claude-haiku-4-5-20251001")), 6);
  assert.ok(Math.abs(estimateCostUsd(usage, pricingFromEnv({}, "claude-haiku-5-5")) - 0.6) < 1e-9);
  // Modèle inconnu : tarif par défaut (Haiku 4.5) ; variable d'environnement prioritaire.
  assert.equal(estimateCostUsd(usage, pricingFromEnv({}, "inconnu")), 6);
  assert.equal(estimateCostUsd(usage, pricingFromEnv({ AI_PRICE_INPUT_PER_MTOK: "3" }, "claude-opus-5-5")), 23);
});

test("jetons d'entrée estimés d'après la longueur du texte (appel coupé sans décompte)", () => {
  assert.equal(estimateInputTokens(0), 0);
  assert.equal(estimateInputTokens(3500), 1000);
  assert.equal(estimateInputTokens(70_000), 20_000);
});
