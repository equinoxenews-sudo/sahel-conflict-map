import assert from "node:assert/strict";
import test from "node:test";
import { monthStartUtc, monthlyCapUsd, decideReservation, serviceReserveUsd } from "../lib/supervision/core/budget";
import { creditStatus, type CreditOperation } from "../lib/supervision/core/credits";
import { allowsProcessing, resolveAccess, type EntitlementRow } from "../lib/supervision/core/entitlements";
import { STATES, canTransition, capabilities, occupiesActiveSlot, occupiesPausedSlot } from "../lib/supervision/core/lifecycle";
import { classifyScopeChange, zoneReplaced, type ScopeSnapshot } from "../lib/supervision/core/majorChange";
import { DEFAULT_POLICY, applyPolicyOverride, policyFromEnv } from "../lib/supervision/core/policy";

const DAY = 86_400_000;
const d = (iso: string) => new Date(iso);

// --- Politique ----------------------------------------------------------------------------------------------------------

test("politique par défaut : exactement les règles validées par Nicolas (D2, D7, 09/11/2026)", () => {
  const t = DEFAULT_POLICY.tiers;
  assert.deepEqual([t.intelligence.activeLimit, t.intelligence.pausedLimit, t.intelligence.majorCreditsPerWindow], [1, 3, 1]);
  assert.deepEqual([t.pro.activeLimit, t.pro.pausedLimit, t.pro.majorCreditsPerWindow], [3, 10, 3]);
  assert.equal(t.plus.supervisionAccess, false, "« plus » : sans Supervision");
  assert.equal(t.enterprise.majorCreditsPerWindow, null, "Enterprise : sur devis, pas de plafond automatique");
  assert.equal(DEFAULT_POLICY.creditWindowDays, 30);
  assert.equal(DEFAULT_POLICY.majorChange.volumeIncreaseThreshold, 0.3, "+30 %, pas ×1,5");
  assert.equal(DEFAULT_POLICY.majorChange.costIncreaseThreshold, 0.3);
  assert.equal(DEFAULT_POLICY.readOnlyGraceDays, 90);
  assert.equal(t.intelligence.monthlyPriceEur, 19.99);
  assert.equal(t.pro.monthlyPriceEur, 49.99);
});

test("politique : réglages ajustables côté serveur, validés, jamais de plantage", () => {
  const ok = applyPolicyOverride({ majorChange: { volumeIncreaseThreshold: 0.5 }, tiers: { pro: { majorCreditsPerWindow: 5 } } });
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.equal(ok.policy.majorChange.volumeIncreaseThreshold, 0.5);
    assert.equal(ok.policy.tiers.pro.majorCreditsPerWindow, 5);
    assert.equal(ok.policy.tiers.pro.activeLimit, 3, "le reste est inchangé");
  }
  assert.equal(DEFAULT_POLICY.majorChange.volumeIncreaseThreshold, 0.3, "les valeurs par défaut ne sont jamais modifiées");

  for (const bad of [{ majorChange: { volumeIncreaseThreshold: -1 } }, { majorChange: { volumeIncreaseThreshold: 0 } }, { unknownKey: 1 }, { tiers: { pro: { activeLimit: 2.5 } } }, { ai: { safetyShare: 2 } }, { creditWindowDays: 0 }, { tiers: { pro: { activeLimit: "3" } } }]) {
    assert.equal(applyPolicyOverride(bad).ok, false, JSON.stringify(bad));
  }
  assert.equal(policyFromEnv({ SUPERVISION_POLICY_JSON: "pas du json" }).ok, false);
  assert.ok(policyFromEnv({}).ok);
  // Un plafond de crédits peut être levé (null) pour une offre qui en avait un, mais pas un nombre d'emplacements.
  const lifted = applyPolicyOverride({ tiers: { pro: { majorCreditsPerWindow: null } } });
  assert.ok(lifted.ok && lifted.policy.tiers.pro.majorCreditsPerWindow === null);
  assert.equal(applyPolicyOverride({ tiers: { pro: { activeLimit: null } } }).ok, false);
});

// --- Modification majeure ------------------------------------------------------------------------------------------------

const mali: ScopeSnapshot = {
  scope: { primaryZone: { kind: "countries", codes: ["MLI"] }, objective: "securite", countries: ["MLI"], sources: ["rss:a", "rss:b"], keywords: ["jnim"], entities: [] },
  estimate: { volumePerMonth: 1000, volumeConfidence: "measured", aiCostUsdPerMonth: 1.0, costConfidence: "measured" },
};
const rules = DEFAULT_POLICY.majorChange;
const withEstimate = (base: ScopeSnapshot, volume: number | null, cost: number | null, confidence: "measured" | "estimated" | "unknown" = "measured"): ScopeSnapshot => ({
  scope: base.scope,
  estimate: { volumePerMonth: volume, volumeConfidence: confidence, aiCostUsdPerMonth: cost, costConfidence: confidence },
});

test("géographie : remplacer la zone principale (Mali → Taïwan) est majeur ; l'élargir ne l'est pas par lui-même", () => {
  const taiwan: ScopeSnapshot = { ...mali, scope: { ...mali.scope, primaryZone: { kind: "countries", codes: ["TWN"] }, countries: ["TWN"] } };
  const result = classifyScopeChange(mali, taiwan, rules);
  assert.ok(result.major && result.reasons.includes("zone_replaced"));
  const larger: ScopeSnapshot = { ...mali, scope: { ...mali.scope, primaryZone: { kind: "countries", codes: ["MLI", "NER"] } } };
  assert.equal(zoneReplaced(mali.scope.primaryZone, larger.scope.primaryZone), false, "Mali + Niger contient toujours le Mali");
  assert.equal(classifyScopeChange(mali, withEstimate(larger, 1100, 1.1), rules).major, false, "+10 % de volume : mineur");
  assert.equal(zoneReplaced({ kind: "circle", lat: 10, lon: 2, radiusKm: 100 }, { kind: "circle", lat: 10.5, lon: 2.2, radiusKm: 120 }), false, "cercles qui se recouvrent");
  assert.equal(zoneReplaced({ kind: "circle", lat: 10, lon: 2, radiusKm: 100 }, { kind: "circle", lat: 25, lon: 121, radiusKm: 100 }), true, "cercles disjoints");
  assert.equal(zoneReplaced({ kind: "countries", codes: ["MLI"] }, { kind: "circle", lat: 14, lon: -4, radiusKm: 300 }), true, "pays → cercle : jamais de bénéfice du doute");
});

test("objectif : changer fondamentalement de sujet est majeur", () => {
  const economic: ScopeSnapshot = { ...mali, scope: { ...mali.scope, objective: "economie" } };
  const result = classifyScopeChange(mali, economic, rules);
  assert.ok(result.major && result.reasons.includes("objective_changed"));
  assert.equal(classifyScopeChange(mali, { ...mali, scope: { ...mali.scope, objective: " Securite " } }, rules).major, false, "casse et espaces ignorés");
});

test("volume et coût : « plus de 30 % » (30 % exactement n'est pas majeur), seuil configurable", () => {
  assert.equal(classifyScopeChange(mali, withEstimate(mali, 1299, 1.299), rules).major, false);
  assert.equal(classifyScopeChange(mali, withEstimate(mali, 1300, 1.3), rules).major, false, "exactement +30 % : mineur");
  const volume = classifyScopeChange(mali, withEstimate(mali, 1301, 1.0), rules);
  assert.ok(volume.major && volume.reasons.join() === "volume_increase");
  const cost = classifyScopeChange(mali, withEstimate(mali, 1000, 1.31), rules);
  assert.ok(cost.major && cost.reasons.join() === "cost_increase");
  assert.equal(classifyScopeChange(mali, withEstimate(mali, 1400, 1.4), { ...rules, volumeIncreaseThreshold: 0.5, costIncreaseThreshold: 0.5 }).major, false, "seuil à +50 % : +40 % reste mineur");
  assert.equal(classifyScopeChange(mali, withEstimate(mali, 400, 0.4), rules).major, false, "une réduction est toujours mineure");
});

test("hausses successives : comparées CUMULATIVEMENT au périmètre de référence, pas à la version précédente", () => {
  // Deux hausses de +20 % : chacune est mineure par rapport à la précédente, mais la seconde fait +44 % par rapport à la référence.
  const step1 = classifyScopeChange(mali, withEstimate(mali, 1200, 1.2), rules);
  assert.equal(step1.major, false);
  const step2 = classifyScopeChange(mali, withEstimate(mali, 1440, 1.44), rules);
  assert.ok(step2.major, "la référence reste le périmètre de la dernière création ou refonte majeure");
  assert.ok(step2.volumeIncrease !== null && Math.abs(step2.volumeIncrease - 0.44) < 1e-9);
});

test("estimation non fiable : signalée avant activation, et un élargissement non chiffrable est traité comme majeur", () => {
  const expanded: ScopeSnapshot = { ...mali, scope: { ...mali.scope, sources: [...mali.scope.sources, "telegram:c"], keywords: ["jnim", "wagner"] }, estimate: { volumePerMonth: null, volumeConfidence: "unknown", aiCostUsdPerMonth: null, costConfidence: "unknown" } };
  const result = classifyScopeChange(mali, expanded, rules);
  assert.deepEqual(result.warnings.sort(), ["cost_estimate_unreliable", "volume_estimate_unreliable"]);
  assert.ok(result.major && result.reasons.includes("unreliable_expansion"), "un gros élargissement ne contourne pas le quota");
  assert.equal(classifyScopeChange(mali, expanded, { ...rules, unreliableExpansionIsMajor: false }).major, false, "réglable");
  // Sans élargissement, une estimation inconnue ne bloque rien (rien n'est ajouté).
  const same: ScopeSnapshot = { ...mali, estimate: expanded.estimate };
  const quiet = classifyScopeChange(mali, same, rules);
  assert.equal(quiet.major, false);
  assert.deepEqual(quiet.warnings, []);
  // Ajouter un mot-clé avec une estimation fiable et faible n'est PAS automatiquement majeur.
  const small: ScopeSnapshot = { ...mali, scope: { ...mali.scope, keywords: ["jnim", "wagner"] }, estimate: { ...mali.estimate, volumePerMonth: 1050, aiCostUsdPerMonth: 1.05 } };
  assert.equal(classifyScopeChange(mali, small, rules).major, false);
});

// --- Crédit sur fenêtre glissante ---------------------------------------------------------------------------------------

test("crédit : fenêtre glissante de 30 jours depuis chaque opération valide, pas le mois civil", () => {
  const now = d("2026-11-09T12:00:00Z");
  const ops: CreditOperation[] = [{ countedAt: new Date(now.getTime() - 29 * DAY), status: "committed", consumesCredit: true }];
  const blocked = creditStatus(ops, 1, now, 30);
  assert.equal(blocked.available, false);
  assert.equal(blocked.nextEligibleAt?.getTime(), ops[0].countedAt.getTime() + 30 * DAY, "libéré 30 jours après l'opération");
  assert.equal(creditStatus(ops, 1, new Date(now.getTime() + 2 * DAY), 30).available, true, "l'opération sort de la fenêtre");
  // Un mois civil naïf aurait libéré le crédit au 1er décembre : ici, 30 jours exactement.
  assert.ok((blocked.nextEligibleAt?.getTime() ?? 0) - now.getTime() === DAY);
});

test("crédit : une opération en attente compte (deux demandes simultanées), une annulée ou sans crédit non", () => {
  const now = d("2026-11-09T12:00:00Z");
  const ops: CreditOperation[] = [
    { countedAt: new Date(now.getTime() - 1000), status: "pending", consumesCredit: true },
    { countedAt: new Date(now.getTime() - 2000), status: "cancelled", consumesCredit: true },
    { countedAt: new Date(now.getTime() - 3000), status: "committed", consumesCredit: false }, // pause, réactivation, modification mineure
  ];
  const status = creditStatus(ops, 1, now, 30);
  assert.equal(status.used, 1);
  assert.equal(status.available, false);
  assert.equal(creditStatus(ops, null, now, 30).available, true, "illimité");
});

test("crédit Pro : trois par fenêtre, la date de prochaine admissibilité est celle de la plus ancienne opération qui sort", () => {
  const now = d("2026-11-20T00:00:00Z");
  const times = [20, 10, 3].map((age) => new Date(now.getTime() - age * DAY));
  const ops: CreditOperation[] = times.map((countedAt) => ({ countedAt, status: "committed", consumesCredit: true }));
  const status = creditStatus(ops, 3, now, 30);
  assert.equal(status.available, false);
  assert.equal(status.nextEligibleAt?.getTime(), times[0].getTime() + 30 * DAY, "la plus ancienne (il y a 20 jours) sort dans 10 jours");
  assert.equal(creditStatus(ops.slice(1), 3, now, 30).available, true);
});

// --- États --------------------------------------------------------------------------------------------------------------

test("états : transitions autorisées, activation en deux temps, pas de retour depuis « supprimé »", () => {
  assert.ok(canTransition("draft", "initializing"));
  assert.equal(canTransition("draft", "active"), false, "on passe toujours par l'initialisation (le crédit n'est consommé qu'à la confirmation)");
  assert.ok(canTransition("initializing", "active"));
  assert.ok(canTransition("initializing", "draft"), "échec technique : retour au brouillon, crédit rendu");
  assert.ok(canTransition("active", "paused") && canTransition("paused", "active"));
  assert.equal(canTransition("deleted", "active"), false);
  assert.equal(canTransition("paused", "initializing"), false);
  for (const state of STATES) assert.ok(Array.isArray([capabilities(state)]));
});

test("états : une veille en pause ne collecte pas, n'appelle pas l'IA et n'envoie rien, mais reste consultable et son tableau modifiable", () => {
  const paused = capabilities("paused");
  assert.deepEqual([paused.collect, paused.ai, paused.notify, paused.assistant], [false, false, false, false]);
  assert.deepEqual([paused.read, paused.export, paused.editDashboard], [true, true, true]);
  const grace = capabilities("read_only_grace");
  assert.deepEqual([grace.read, grace.export, grace.editDashboard, grace.collect, grace.notify], [true, true, false, false, false]);
  assert.equal(capabilities("deleted").read, false);
  assert.equal(capabilities("active").notify, true);
  assert.ok(occupiesActiveSlot("initializing") && occupiesActiveSlot("active") && !occupiesActiveSlot("paused"));
  assert.ok(occupiesPausedSlot("paused") && !occupiesPausedSlot("draft"));
});

// --- Droits -------------------------------------------------------------------------------------------------------------

test("droits : sans ligne, l'offre du compte s'applique ; « plus » n'ouvre pas la Supervision", () => {
  const now = d("2026-11-09T00:00:00Z");
  const intelligence = resolveAccess("intelligence", [], DEFAULT_POLICY, now);
  assert.deepEqual([intelligence.mode, intelligence.activeLimit, intelligence.pausedLimit, intelligence.creditLimit, intelligence.source], ["full", 1, 3, 1, "account"]);
  const plus = resolveAccess("plus", [], DEFAULT_POLICY, now);
  assert.deepEqual([plus.mode, plus.reason], ["none", "plan_without_supervision"]);
  assert.equal(resolveAccess("owner", [], DEFAULT_POLICY, now).creditLimit, null, "fondateur : sans plafond");
  assert.equal(allowsProcessing(plus), false);
});

test("droits : la ligne la plus récente déjà en vigueur l'emporte ; surcharges de limites ; contrat sur mesure sans plafond", () => {
  const now = d("2026-11-09T00:00:00Z");
  const rows: EntitlementRow[] = [
    { plan: "intelligence", activeLimit: null, pausedLimit: null, creditLimit: null, creditUnlimited: false, effectiveAt: d("2026-10-01T00:00:00Z"), expiresAt: null },
    { plan: "pro", activeLimit: null, pausedLimit: null, creditLimit: null, creditUnlimited: false, effectiveAt: d("2026-11-01T00:00:00Z"), expiresAt: null },
    { plan: "enterprise", activeLimit: 20, pausedLimit: null, creditLimit: null, creditUnlimited: true, effectiveAt: d("2026-12-01T00:00:00Z"), expiresAt: null }, // pas encore en vigueur
  ];
  const pro = resolveAccess("intelligence", rows, DEFAULT_POLICY, now);
  assert.deepEqual([pro.plan, pro.activeLimit, pro.creditLimit, pro.source], ["pro", 3, 3, "entitlement"]);
  const later = resolveAccess("intelligence", rows, DEFAULT_POLICY, d("2026-12-02T00:00:00Z"));
  assert.deepEqual([later.plan, later.activeLimit, later.pausedLimit, later.creditLimit], ["enterprise", 20, 30, null]);
});

test("droits : à l'expiration effective (pas avant), 90 jours de lecture seule puis plus rien ; aucun traitement en lecture seule", () => {
  const expires = d("2026-11-30T00:00:00Z");
  const rows: EntitlementRow[] = [{ plan: "pro", activeLimit: null, pausedLimit: null, creditLimit: null, creditUnlimited: false, effectiveAt: d("2026-10-01T00:00:00Z"), expiresAt: expires }];
  assert.equal(resolveAccess("pro", rows, DEFAULT_POLICY, d("2026-11-29T23:59:59Z")).mode, "full", "la période payée court encore");
  const grace = resolveAccess("pro", rows, DEFAULT_POLICY, d("2026-12-15T00:00:00Z"));
  assert.deepEqual([grace.mode, grace.reason], ["read_only", "expired_grace"]);
  assert.equal(grace.readOnlyUntil?.getTime(), expires.getTime() + 90 * DAY);
  assert.equal(allowsProcessing(grace), false);
  assert.equal(resolveAccess("pro", rows, DEFAULT_POLICY, new Date(expires.getTime() + 89 * DAY)).mode, "read_only");
  assert.deepEqual(((p) => [p.mode, p.reason])(resolveAccess("pro", rows, DEFAULT_POLICY, new Date(expires.getTime() + 91 * DAY))), ["none", "grace_ended"]);
  // Réabonnement : une nouvelle ligne en vigueur remet l'accès complet.
  const renewed: EntitlementRow[] = [...rows, { plan: "pro", activeLimit: null, pausedLimit: null, creditLimit: null, creditUnlimited: false, effectiveAt: d("2026-12-10T00:00:00Z"), expiresAt: null }];
  assert.equal(resolveAccess("pro", renewed, DEFAULT_POLICY, d("2026-12-15T00:00:00Z")).mode, "full");
});

// --- Budget IA ----------------------------------------------------------------------------------------------------------

test("budget IA : plafond = 10 % du prix, en dollars, avec marge de sécurité ; pas de plafond pour le fondateur", () => {
  const intelligence = monthlyCapUsd(DEFAULT_POLICY, "intelligence");
  const pro = monthlyCapUsd(DEFAULT_POLICY, "pro");
  assert.ok(intelligence !== null && Math.abs(intelligence - 19.99 * 0.1 * 1.15 * 0.95) < 1e-4, `intelligence ${intelligence}`);
  assert.ok(pro !== null && Math.abs(pro - 49.99 * 0.1 * 1.15 * 0.95) < 1e-4);
  assert.equal(monthlyCapUsd(DEFAULT_POLICY, "owner"), null);
  assert.equal(monthlyCapUsd(DEFAULT_POLICY, "enterprise"), null);
  assert.equal(monthStartUtc(d("2026-11-09T12:00:00Z")).toISOString(), "2026-11-01T00:00:00.000Z");
});

test("budget IA : la réserve de service reste aux tâches essentielles ; à l'épuisement, refus sans jamais dépasser", () => {
  const cap = 2.0;
  const reserve = serviceReserveUsd(DEFAULT_POLICY, cap);
  assert.equal(reserve, 0.4);
  const base = { capUsd: cap, serviceReserveUsd: reserve };
  assert.equal(decideReservation({ ...base, essential: false, spentUsd: 1.5, estimateUsd: 0.1 }).allowed, true);
  const refused = decideReservation({ ...base, essential: false, spentUsd: 1.55, estimateUsd: 0.1 });
  assert.equal(refused.allowed, false, "non essentiel : plafond moins la réserve (1,6 $)");
  assert.equal(decideReservation({ ...base, essential: true, spentUsd: 1.55, estimateUsd: 0.1 }).allowed, true, "essentiel : peut puiser dans la réserve");
  assert.equal(decideReservation({ ...base, essential: true, spentUsd: 1.95, estimateUsd: 0.1 }).allowed, false, "jamais au-delà du plafond, même essentiel");
  assert.equal(decideReservation({ capUsd: null, serviceReserveUsd: 0, essential: false, spentUsd: 999, estimateUsd: 5 }).allowed, true, "sans plafond");
  assert.equal(decideReservation({ ...base, essential: false, spentUsd: 1.6, estimateUsd: 0 }).allowed, true, "exactement au plafond : accepté");
});
