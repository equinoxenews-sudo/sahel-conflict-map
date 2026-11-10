// Tests d'INTÉGRATION du Lot 1 : ils parlent à la base de PRÉPRODUCTION (equinoxe-staging), jamais à la production.
//
//   npm run test:staging
//
// Garde-fous : le test refuse de tourner si l'adresse de la base du fichier .env.local n'est pas celle de la préproduction
// (STAGING_PROJECT_REF), et tout ce qu'il écrit porte un identifiant de test unique, supprimé à la fin. Il faut avoir exécuté
// supabase/supervision-lot1.sql dans la préproduction avant.

import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { monthlyCapUsd } from "../../lib/supervision/core/budget";
import { resolveAccess, type AccessProfile } from "../../lib/supervision/core/entitlements";
import type { Confidence, ScopeSnapshot } from "../../lib/supervision/core/majorChange";
import { DEFAULT_POLICY } from "../../lib/supervision/core/policy";
import * as store from "../../lib/supervision/core/store";

/** Identifiant public (non secret) du projet de préproduction. */
const STAGING_PROJECT_REF = "upoknwoctatqmlonitzx";

dotenv.config({ path: ".env.local", quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const host = (() => {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
})();
const skip = !url || !serviceKey ? "Variables Supabase absentes de .env.local." : host.split(".")[0] !== STAGING_PROJECT_REF ? `Base « ${host} » : ce n'est PAS la préproduction, tests refusés.` : false;

const admin = skip ? null : createClient(url, serviceKey, { auth: { persistSession: false } });
const runId = Math.random().toString(36).slice(2, 8);
const owners: string[] = [];
const owner = (label: string) => {
  const id = `it-${runId}-${label}`;
  owners.push(id);
  return id;
};

const NOW = new Date();
const DAY = 86_400_000;
const access = (tier: Parameters<typeof resolveAccess>[0], over: Partial<AccessProfile> = {}): AccessProfile => ({ ...resolveAccess(tier, [], DEFAULT_POLICY, NOW), ...over });
const snap = (code = "MLI", volume = 1000, cost = 1, objective = "securite", confidence: Confidence = "measured"): ScopeSnapshot => ({
  scope: { primaryZone: { kind: "countries", codes: [code] }, objective, countries: [code], sources: ["rss:a"], keywords: ["test"], entities: [] },
  estimate: { volumePerMonth: volume, volumeConfidence: confidence, aiCostUsdPerMonth: cost, costConfidence: confidence },
});

async function draft(ownerId: string, name = "Veille de test", snapshot: ScopeSnapshot = snap()) {
  const result = await store.createDraft(ownerId, name, snapshot);
  assert.ok(result.ok, JSON.stringify(result));
  return result.supervision_id;
}

async function activateAndConfirm(ownerId: string, id: string, key: string, acc: AccessProfile, now?: Date) {
  const activated = await store.activate(ownerId, id, key, acc, now);
  assert.ok(activated.ok, JSON.stringify(activated));
  const confirmed = await store.confirmOperation(ownerId, key, now);
  assert.ok(confirmed.ok, JSON.stringify(confirmed));
}

before(async () => {
  if (skip || !admin) return;
  const { error } = await admin.rpc("sv_credit_status", { p_owner: "probe", p_credit_limit: 1, p_window_days: 30 });
  if (error) throw new Error(`La préproduction n'a pas les fonctions du Lot 1 (${error.message}). Exécute supabase/supervision-lot1.sql dans le SQL Editor de equinoxe-staging.`);
});

after(async () => {
  if (!admin) return;
  for (const id of owners) {
    await admin.from("sv_ai_ledger").delete().eq("owner_id", id);
    await admin.from("sv_operation_ledger").delete().eq("owner_id", id);
    await admin.from("sv_entitlements").delete().eq("owner_id", id);
    await admin.from("sv_supervisions").delete().eq("owner_id", id);
  }
});

test("activation en deux temps : le crédit n'est consommé qu'à la confirmation, la Supervision passe brouillon → initialisation → active", { skip }, async () => {
  const o = owner("deux-temps");
  const id = await draft(o);
  const acc = access("intelligence");
  assert.equal((await store.getSupervision(o, id))?.state, "draft");
  const activated = await store.activate(o, id, "k1", acc);
  assert.ok(activated.ok && activated.status === "pending");
  assert.equal((await store.getSupervision(o, id))?.state, "initializing");
  assert.equal((await store.creditStatus(o, acc)).used, 1, "réservé pendant l'initialisation");
  const confirmed = await store.confirmOperation(o, "k1");
  assert.ok(confirmed.ok);
  const after = await store.getSupervision(o, id);
  assert.equal(after?.state, "active");
  assert.ok(after?.activatedAt && after.referenceScopeVersionId, "date d'activation et périmètre de référence posés");
  assert.equal((await store.creditStatus(o, acc)).available, false, "Intelligence : un seul crédit par fenêtre");
});

test("double clic : la même clé jouée deux fois en parallèle ne consomme qu'un crédit", { skip }, async () => {
  const o = owner("double-clic");
  const id = await draft(o);
  const acc = access("pro");
  const [a, b] = await Promise.all([store.activate(o, id, "same", acc), store.activate(o, id, "same", acc)]);
  assert.ok(a.ok && b.ok);
  assert.equal([a, b].filter((r) => r.ok && r.replay).length, 1, "une exécution, un rejeu");
  assert.equal((await store.creditStatus(o, acc)).used, 1);
  const { count } = await admin!.from("sv_operation_ledger").select("*", { count: "exact", head: true }).eq("owner_id", o);
  assert.equal(count, 1);
  const confirmedTwice = await Promise.all([store.confirmOperation(o, "same"), store.confirmOperation(o, "same")]);
  assert.ok(confirmedTwice.every((r) => r.ok));
  assert.equal((await store.creditStatus(o, acc)).used, 1);
});

test("concurrence : plusieurs créations simultanées ne contournent pas le crédit (un seul crédit, aucun emplacement bloquant)", { skip }, async () => {
  const o = owner("credit-concurrent");
  const ids = await Promise.all([draft(o, "Veille A"), draft(o, "Veille B"), draft(o, "Veille C")]);
  const acc = access("pro", { activeLimit: 10, creditLimit: 1 });
  const results = await Promise.all(ids.flatMap((id, i) => [store.activate(o, id, `c${i}-x`, acc), store.activate(o, id, `c${i}-y`, acc)]));
  const ok = results.filter((r) => r.ok);
  assert.equal(ok.length, 1, `exactement une activation doit passer : ${JSON.stringify(results.map((r) => (r.ok ? "ok" : r.code)))}`);
  assert.ok(results.filter((r) => !r.ok).every((r) => !r.ok && (r.code === "credit_exhausted" || r.code === "invalid_state")));
  assert.equal((await store.creditStatus(o, acc)).used, 1);
});

test("concurrence : la limite d'emplacements actifs tient sous simultanéité", { skip }, async () => {
  const o = owner("actifs-concurrent");
  const ids = await Promise.all([draft(o, "Veille A"), draft(o, "Veille B"), draft(o, "Veille C")]);
  const acc = access("intelligence", { activeLimit: 1, creditLimit: null });
  const results = await Promise.all(ids.map((id, i) => store.activate(o, id, `a${i}`, acc)));
  assert.equal(results.filter((r) => r.ok).length, 1);
  assert.equal(results.filter((r) => !r.ok && r.code === "active_limit_reached").length, 2);
});

test("échec technique : l'annulation rend le crédit et la Supervision revient en brouillon, réactivable", { skip }, async () => {
  const o = owner("echec");
  const id = await draft(o);
  const acc = access("intelligence");
  assert.ok((await store.activate(o, id, "try1", acc)).ok);
  assert.equal((await store.creditStatus(o, acc)).available, false);
  assert.ok((await store.cancelOperation(o, "try1", "collecte indisponible")).ok);
  assert.equal((await store.getSupervision(o, id))?.state, "draft");
  assert.equal((await store.creditStatus(o, acc)).used, 0, "crédit rendu");
  assert.equal((await store.cancelOperation(o, "try1", "encore")).ok, true, "annulation idempotente");
  assert.deepEqual(await store.confirmOperation(o, "try1").then((r) => (r.ok ? "ok" : r.code)), "cancelled", "on ne confirme pas une opération annulée");
  await activateAndConfirm(o, id, "try2", acc);
  assert.equal((await store.getSupervision(o, id))?.state, "active");
});

test("une activation jamais confirmée (plantage) libère son crédit à l'expiration", { skip }, async () => {
  const o = owner("expiration");
  const first = await draft(o, "Veille A");
  const second = await draft(o, "Veille B");
  const acc = access("intelligence", { activeLimit: 5 });
  const twoHoursAgo = new Date(NOW.getTime() - 2 * 3_600_000);
  assert.ok((await store.activate(o, first, "stuck", acc, twoHoursAgo)).ok);
  // 30 minutes plus tard (délai par défaut) la réservation est périmée : la demande suivante la libère.
  const next = await store.activate(o, second, "next", acc);
  assert.ok(next.ok, JSON.stringify(next));
  assert.equal((await store.getSupervision(o, first))?.state, "draft", "la veille restée en initialisation revient en brouillon");
});

test("fenêtre glissante : 29 jours après, le crédit est encore pris ; il est libéré 30 jours après l'opération (pas au 1er du mois)", { skip }, async () => {
  const o = owner("fenetre");
  const first = await draft(o, "Veille A");
  const second = await draft(o, "Veille B");
  const acc = access("intelligence", { activeLimit: 5 });
  const start = new Date(NOW.getTime() - 29 * DAY);
  await activateAndConfirm(o, first, "old", acc, start);
  const blocked = await store.activate(o, second, "again", acc, NOW);
  assert.ok(!blocked.ok && blocked.code === "credit_exhausted", JSON.stringify(blocked));
  const next = (blocked as { detail: { next_eligible_at?: string } }).detail.next_eligible_at;
  assert.ok(next && Math.abs(new Date(next).getTime() - (start.getTime() + 30 * DAY)) < 2000, "libéré 30 jours après l'opération");
  const later = await store.activate(o, second, "later", acc, new Date(NOW.getTime() + 2 * DAY));
  assert.ok(later.ok, JSON.stringify(later));
});

test("pause et reprise : aucun crédit, emplacements respectés, jamais de dépassement sous simultanéité", { skip }, async () => {
  const o = owner("pause");
  const a = await draft(o, "Veille A");
  const b = await draft(o, "Veille B");
  const acc = access("intelligence", { activeLimit: 1, pausedLimit: 1, creditLimit: null });
  await activateAndConfirm(o, a, "act-a", acc);
  assert.ok((await store.pause(o, a, "pause-a", acc)).ok);
  assert.equal((await store.getSupervision(o, a))?.state, "paused");
  await activateAndConfirm(o, b, "act-b", acc);
  const blocked = await store.resume(o, a, "resume-a", acc);
  assert.ok(!blocked.ok && blocked.code === "active_limit_reached");
  assert.equal((await store.pause(o, b, "pause-b", acc)).ok, false, "limite de pauses : une seule");
  assert.ok((await store.pause(o, b, "pause-b2", { ...acc, pausedLimit: 2 })).ok);
  assert.ok((await store.resume(o, a, "resume-a2", acc)).ok);
  assert.equal((await store.getSupervision(o, a))?.state, "active");
  const used = (await store.creditStatus(o, { ...acc, creditLimit: 5 })).used;
  assert.equal(used, 2, "seules les deux premières activations ont consommé un crédit, ni pause ni reprise");
});

test("modification de périmètre : mineure = sans crédit ; majeure = crédit ; comparaison cumulative à la référence ; refonte confirmée = nouvelle référence", { skip }, async () => {
  const o = owner("perimetre");
  const id = await draft(o, "Veille Mali", snap("MLI", 1000, 1));
  const acc = access("pro", { creditLimit: 2 });
  await activateAndConfirm(o, id, "start", acc);
  assert.equal((await store.creditStatus(o, acc)).used, 1);

  const minor = await store.proposeScopeChange(o, id, "m1", snap("MLI", 1200, 1.2), acc);
  assert.ok("classification" in minor && minor.outcome.ok);
  assert.equal(minor.classification.major, false);
  assert.equal((await store.creditStatus(o, acc)).used, 1, "une modification mineure ne consomme aucun crédit");

  // Deuxième hausse de +20 % : +44 % par rapport à la RÉFÉRENCE (1000), donc majeure.
  const major = await store.proposeScopeChange(o, id, "m2", snap("MLI", 1440, 1.44), acc);
  assert.ok("classification" in major && major.outcome.ok);
  assert.equal(major.classification.major, true);
  assert.ok(major.classification.reasons.includes("volume_increase"));
  assert.equal((await store.creditStatus(o, acc)).used, 2, "crédit réservé pour la refonte");
  const pending = await store.getSupervision(o, id);
  assert.ok(pending?.pendingScopeVersionId, "version en attente");
  const blockedWhilePending = await store.proposeScopeChange(o, id, "m3", snap("MLI", 1500, 1.5), acc);
  assert.ok(!("classification" in blockedWhilePending && blockedWhilePending.outcome.ok), "pas de deuxième refonte pendant qu'une est en attente");

  assert.ok((await store.confirmOperation(o, "m2")).ok);
  const confirmed = await store.getSupervision(o, id);
  assert.equal(confirmed?.referenceScopeVersionId, confirmed?.currentScopeVersionId, "la refonte confirmée devient la nouvelle référence");
  assert.equal(confirmed?.pendingScopeVersionId, null);

  // Nouvelle référence = 1440 : +10 % reste mineur ; un nouveau changement majeur trouve le crédit épuisé (limite 2).
  const small = await store.proposeScopeChange(o, id, "m4", snap("MLI", 1584, 1.58), acc);
  assert.ok("classification" in small && !small.classification.major);
  const exhausted = await store.proposeScopeChange(o, id, "m5", snap("TWN", 1000, 1, "securite"), acc);
  assert.ok("classification" in exhausted && exhausted.classification.major && !exhausted.outcome.ok && exhausted.outcome.code === "credit_exhausted");
});

test("estimation non fiable : l'élargissement est traité comme majeur et les avertissements sont renvoyés", { skip }, async () => {
  const o = owner("non-fiable");
  const id = await draft(o);
  const acc = access("pro");
  await activateAndConfirm(o, id, "go", acc);
  const wide = snap("MLI", 0, 0, "securite", "unknown");
  wide.scope.keywords = ["test", "nouveau"];
  wide.estimate.volumePerMonth = null;
  wide.estimate.aiCostUsdPerMonth = null;
  const result = await store.proposeScopeChange(o, id, "w1", wide, acc);
  assert.ok("classification" in result);
  assert.ok(result.classification.major && result.classification.reasons.includes("unreliable_expansion"));
  assert.ok(result.classification.warnings.length === 2);
});

test("isolation A/B : un compte ne lit, n'active, ne met en pause ni ne modifie jamais la Supervision d'un autre, même en connaissant son identifiant", { skip }, async () => {
  const a = owner("iso-a");
  const b = owner("iso-b");
  const idA = await draft(a, "Veille de A");
  const acc = access("pro");
  await activateAndConfirm(a, idA, "a-act", acc);

  assert.equal(await store.getSupervision(b, idA), null, "lecture refusée");
  assert.deepEqual((await store.listSupervisions(b)).map((s) => s.id), [], "la liste de B est vide");
  assert.equal((await store.listSupervisions(a)).length, 1);
  const stolenActivate = await store.activate(b, idA, "b-steal", acc);
  assert.ok(!stolenActivate.ok && stolenActivate.code === "not_found");
  const stolenPause = await store.pause(b, idA, "b-pause", acc);
  assert.ok(!stolenPause.ok && stolenPause.code === "not_found");
  const stolenChange = await store.proposeScopeChange(b, idA, "b-change", snap("TWN"), acc);
  assert.ok(!("classification" in stolenChange) && !stolenChange.ok && stolenChange.code === "not_found");
  assert.equal(await store.getScopeSnapshot(b, idA, (await store.getSupervision(a, idA))!.currentScopeVersionId!), null, "périmètre illisible par B");
  assert.equal((await store.getSupervision(a, idA))?.state, "active", "la Supervision de A n'a pas bougé");
  assert.equal((await store.creditStatus(b, access("pro"))).used, 0, "les crédits de B ne sont pas ceux de A");
  // Même clé d'idempotence chez deux comptes : aucune collision.
  const idB = await draft(b, "Veille de B");
  assert.ok((await store.activate(b, idB, "a-act", acc)).ok, "la clé d'idempotence est propre à chaque compte");
});

test("droits : les lignes sv_entitlements posées à la main sont lues et l'emportent sur l'offre du compte", { skip }, async () => {
  const o = owner("droits");
  assert.equal((await store.loadAccess(o, "intelligence", NOW)).plan, "intelligence", "sans ligne : offre du compte");
  const { error } = await admin!.from("sv_entitlements").insert({ owner_id: o, plan: "pro", effective_at: new Date(NOW.getTime() - DAY).toISOString() });
  assert.equal(error, null);
  const pro = await store.loadAccess(o, "intelligence", NOW);
  assert.deepEqual([pro.plan, pro.activeLimit, pro.creditLimit, pro.source], ["pro", 3, 3, "entitlement"]);
  await admin!.from("sv_entitlements").update({ expires_at: new Date(NOW.getTime() - 5 * DAY).toISOString() }).eq("owner_id", o);
  const grace = await store.loadAccess(o, "intelligence", NOW);
  assert.equal(grace.mode, "read_only");
  const denied = await store.activate(o, await draft(o), "no-way", grace);
  assert.ok(!denied.ok && denied.code === "access_denied", "aucune activation en lecture seule");
});

test("budget IA : 20 réservations simultanées de 0,10 $ sous un plafond de 1 $ — exactement 10 passent, jamais plus", { skip }, async () => {
  const o = owner("budget");
  // Offre sans prix (aucun plafond automatique) : on pilote le plafond directement par la fonction SQL.
  const results = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      admin!.rpc("sv_reserve_ai_budget", {
        p_owner: o, p_op: `op-${i}`, p_supervision: null, p_job: "test", p_model: "haiku", p_estimate: 0.1, p_cap: 1.0, p_service_reserve: 0, p_essential: false,
        p_month_start: new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth(), 1)).toISOString(),
      }),
    ),
  );
  const accepted = results.filter((r) => (r.data as { ok: boolean }).ok).length;
  assert.equal(accepted, 10, `acceptées : ${accepted}`);
  assert.ok(results.filter((r) => !(r.data as { ok: boolean }).ok).every((r) => (r.data as { code: string }).code === "budget_exceeded"));
  const { data } = await admin!.rpc("sv_ai_spent", { p_owner: o, p_month_start: new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth(), 1)).toISOString(), p_stale_minutes: 120 });
  assert.ok(Math.abs(Number(data) - 1.0) < 1e-6, `dépense réservée ${data}`);
});

test("budget IA : règlement au coût réel, libération, rejeu idempotent, réserve de service et expiration des réservations oubliées", { skip }, async () => {
  const o = owner("budget2");
  const base = { ownerId: o, tier: "intelligence" as const, supervisionId: null, job: "test", model: "haiku" };
  // Plafond Intelligence = 4 € × 1,15 × 0,95 ≈ 4,37 $ (offres du 10/11/2026) ; réserve de service 20 % (≈ 0,87 $) : une tâche non essentielle
  // ne dépasse pas ≈ 3,50 $. Si les offres changent, ces montants sont à recalculer : le contrôle ci-dessous le signale.
  const cap = monthlyCapUsd(DEFAULT_POLICY, "intelligence") ?? 0;
  assert.ok(Math.abs(cap - 4.37) < 0.005, `plafond Intelligence ${cap} : adapter les montants de ce test`);
  const first = await store.reserveAiBudget({ ...base, operationId: "r1", estimateUsd: 3.4, essential: false });
  assert.ok(first.ok && !first.replay);
  assert.ok((await store.reserveAiBudget({ ...base, operationId: "r1", estimateUsd: 3.4, essential: false })).ok, "rejeu : la même opération ne réserve pas deux fois");
  const refused = await store.reserveAiBudget({ ...base, operationId: "r2", estimateUsd: 0.2, essential: false });
  assert.ok(!refused.ok && refused.code === "budget_exceeded", "non essentiel : la réserve de service est intouchable");
  const essential = await store.reserveAiBudget({ ...base, operationId: "r3", estimateUsd: 0.2, essential: true });
  assert.ok(essential.ok, "essentiel : peut puiser dans la réserve");
  assert.ok((await store.settleAiBudget(o, "r1", { costUsd: 0.3, inputTokens: 1000, outputTokens: 500, ok: true })).ok);
  assert.ok((await store.reserveAiBudget({ ...base, operationId: "r4", estimateUsd: 2.9, essential: false })).ok, "le coût réel (0,3 $) a remplacé la réservation (3,4 $) : de la place est revenue");
  assert.ok((await store.releaseAiBudget(o, "r4")).ok);
  assert.ok((await store.reserveAiBudget({ ...base, operationId: "r5", estimateUsd: 2.9, essential: false })).ok, "réservation libérée : la place revient");
  // Une réservation oubliée (plantage avant règlement) expire : 3 heures plus tard elle ne pèse plus.
  const later = new Date(NOW.getTime() + 3 * 3_600_000);
  assert.ok((await store.reserveAiBudget({ ...base, operationId: "r6", estimateUsd: 2.9, essential: false }, later)).ok);
});

test("sécurité : les clés publiques n'atteignent rien (ni tables, ni fonctions) ; une version de périmètre est immuable", { skip }, async () => {
  const o = owner("securite");
  const id = await draft(o);
  const pub = createClient(url, anonKey, { auth: { persistSession: false } });
  const read = await pub.from("sv_supervisions").select("id").limit(1);
  assert.ok(read.error !== null || (read.data ?? []).length === 0, "aucune ligne lisible avec la clé publique");
  const write = await pub.from("sv_supervisions").insert({ owner_id: o, name: "intrus" });
  assert.ok(write.error !== null, "écriture refusée");
  const rpc = await pub.rpc("sv_activate", { p_owner: o, p_supervision_id: id, p_key: "x", p_active_limit: 9, p_credit_limit: null, p_window_days: 30, p_ttl_minutes: 30 });
  assert.ok(rpc.error !== null, "fonction inaccessible avec la clé publique");
  const record = await store.getSupervision(o, id);
  const mutate = await admin!.from("sv_scope_versions").update({ scope: { hacked: true } }).eq("id", record!.currentScopeVersionId!);
  assert.ok(mutate.error !== null, "une version de périmètre ne se modifie pas");
});

test("brouillons : leur nombre est borné, sans consommer de crédit", { skip }, async () => {
  const o = owner("brouillons");
  for (let i = 0; i < DEFAULT_POLICY.maxDraftsPerOwner; i++) await draft(o, `Brouillon ${i}`);
  const over = await store.createDraft(o, "Un de trop", snap());
  assert.ok(!over.ok && over.code === "draft_limit_reached");
  assert.equal((await store.creditStatus(o, access("intelligence"))).used, 0);
});
