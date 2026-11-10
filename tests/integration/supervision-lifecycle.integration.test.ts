// Tests d'INTÉGRATION du cycle de vie (activation, pause, reprise, suppression d'un brouillon) : base de PRÉPRODUCTION seulement.
// AUCUN accès réseau : les flux de presse sont simulés.
//   npm run test:staging

import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import type { FeedItem } from "../../lib/rss";
import { activateSupervision } from "../../lib/supervision/core/activation";
import { resolveAccess, type AccessProfile } from "../../lib/supervision/core/entitlements";
import { DEFAULT_POLICY } from "../../lib/supervision/core/policy";
import { initialScope } from "../../lib/supervision/core/scope";
import * as store from "../../lib/supervision/core/store";

const STAGING_PROJECT_REF = "upoknwoctatqmlonitzx";
dotenv.config({ path: ".env.local", quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
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
  const id = `it-life-${runId}-${label}`;
  owners.push(id);
  return id;
};

const NOW = new Date("2026-11-10T12:00:00Z");
/** Droits d'une offre, avec surcharges (ex. une seule place active pour tester la limite). */
const access = (tier: Parameters<typeof resolveAccess>[0], over: Partial<AccessProfile> = {}): AccessProfile => ({ ...resolveAccess(tier, [], DEFAULT_POLICY, NOW), ...over });
const item = (slug: string, title: string): FeedItem => ({ title, url: `https://test.example.com/${runId}/${slug}`, domain: "test.example.com", publishedAt: "2026-11-09T08:00:00.000Z", imageUrl: null, excerpt: "" });
const feed = async () => [item("convoi", "Nigeria : attaque contre un convoi militaire - Journal Test")];
const options = { now: NOW, deps: { fetchFeed: feed, now: NOW } };

async function draft(ownerId: string, name = "Veille de test"): Promise<string> {
  const created = await store.createDraft(ownerId, name, initialScope({ name, country: "NGA", objective: "securite" }));
  assert.ok(created.ok, JSON.stringify(created));
  if (!created.ok) throw new Error("création impossible");
  return created.supervision_id;
}
const stateOf = async (ownerId: string, id: string) => (await store.getSupervision(ownerId, id))?.state;

after(async () => {
  if (!admin) return;
  for (const id of owners) {
    await admin.from("sv_operation_ledger").delete().eq("owner_id", id);
    await admin.from("sv_supervisions").delete().eq("owner_id", id);
  }
  await admin.from("sv_items").delete().like("url", `https://test.example.com/${runId}/%`);
});

test("activation : première collecte, puis la Supervision devient active et le crédit est consommé une seule fois", { skip }, async () => {
  const o = owner("ok");
  const id = await draft(o);
  const acc = access("intelligence");
  const result = await activateSupervision(o, id, `act-${runId}-ok`, acc, { ...options, client: admin! });
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  assert.equal(result.state, "active");
  assert.equal(result.collection?.matched, 1, "le tableau est déjà rempli à l'activation");
  assert.equal(await stateOf(o, id), "active");
  const { data: ledger } = await admin!.from("sv_operation_ledger").select("op_type, status, consumes_credit").eq("owner_id", o);
  assert.deepEqual(ledger, [{ op_type: "activate_new", status: "committed", consumes_credit: true }]);
  assert.equal((await store.creditStatus(o, acc)).used, 1);
  const { data: runs } = await admin!.from("sv_collection_runs").select("status").eq("supervision_id", id);
  assert.deepEqual(runs?.map((run) => run.status), ["ok"]);
});

test("double clic : la même clé rejouée ne consomme rien de plus et ne recollecte pas", { skip }, async () => {
  const o = owner("replay");
  const id = await draft(o);
  const acc = access("intelligence");
  const key = `act-${runId}-replay`;
  const first = await activateSupervision(o, id, key, acc, { ...options, client: admin! });
  const second = await activateSupervision(o, id, key, acc, { ...options, client: admin! });
  assert.ok(first.ok && second.ok && second.replay, JSON.stringify([first, second]));
  assert.equal((await store.creditStatus(o, acc)).used, 1);
  const { count } = await admin!.from("sv_operation_ledger").select("id", { count: "exact", head: true }).eq("owner_id", o);
  assert.equal(count, 1);
  const { count: runs } = await admin!.from("sv_collection_runs").select("id", { count: "exact", head: true }).eq("supervision_id", id);
  assert.equal(runs, 1, "le rejeu ne relance pas de collecte");
});

test("échec de la première collecte : retour en brouillon, crédit rendu, rien consommé ; une nouvelle tentative reste possible", { skip }, async () => {
  const o = owner("echec");
  const id = await draft(o);
  const acc = access("intelligence");
  // Zone « cercle » : non prise en charge par la collecte, donc aucune requête possible.
  const circle = { primaryZone: { kind: "circle", lat: 10, lon: 8, radiusKm: 50 }, objective: "securite", countries: [], sources: [], keywords: [], entities: [] };
  const version = await admin!.from("sv_scope_versions").insert({ supervision_id: id, version_no: 2, scope: circle, estimate: {}, is_major: false, major_reasons: [], origin: "minor_change", effective_at: NOW.toISOString() }).select("id").single();
  assert.equal(version.error, null, version.error?.message);
  const original = (await store.getSupervision(o, id))!.currentScopeVersionId!;
  await admin!.from("sv_supervisions").update({ current_scope_version_id: version.data!.id }).eq("id", id);

  const failed = await activateSupervision(o, id, `act-${runId}-ko`, acc, { ...options, client: admin! });
  assert.ok(!failed.ok && failed.code === "activation_failed", JSON.stringify(failed));
  assert.equal(await stateOf(o, id), "draft");
  assert.equal((await store.creditStatus(o, acc)).used, 0, "le crédit est rendu");
  const { data: ledger } = await admin!.from("sv_operation_ledger").select("status").eq("owner_id", o);
  assert.deepEqual(ledger?.map((row) => row.status), ["cancelled"]);

  // Le périmètre est corrigé : une nouvelle tentative (nouvelle clé) réussit.
  await admin!.from("sv_supervisions").update({ current_scope_version_id: original }).eq("id", id);
  const retry = await activateSupervision(o, id, `act-${runId}-ko2`, acc, { ...options, client: admin! });
  assert.ok(retry.ok, JSON.stringify(retry));
  assert.equal((await store.creditStatus(o, acc)).used, 1);
});

test("limites : une seule place active ; la pause libère la place ; la reprise respecte la limite", { skip }, async () => {
  const o = owner("limites");
  const acc = access("pro", { activeLimit: 1, pausedLimit: 2, creditLimit: null });
  const a = await draft(o, "Veille A");
  const b = await draft(o, "Veille B");
  assert.ok((await activateSupervision(o, a, `act-${runId}-a`, acc, { ...options, client: admin! })).ok);
  const refused = await activateSupervision(o, b, `act-${runId}-b`, acc, { ...options, client: admin! });
  assert.ok(!refused.ok && refused.code === "active_limit_reached" && refused.detail.limit === 1, JSON.stringify(refused));
  assert.equal(await stateOf(o, b), "draft", "refus propre : B reste un brouillon");

  const paused = await store.pause(o, a, `pause-${runId}-a`, acc);
  assert.ok(paused.ok, JSON.stringify(paused));
  assert.equal(await stateOf(o, a), "paused");
  assert.ok((await activateSupervision(o, b, `act-${runId}-b2`, acc, { ...options, client: admin! })).ok, "la place libérée sert à B");
  const resume = await store.resume(o, a, `resume-${runId}-a`, acc);
  assert.ok(!resume.ok && resume.code === "active_limit_reached", "A ne peut pas reprendre tant que B occupe la place");
  assert.equal(await stateOf(o, a), "paused");
});

test("pause et reprise : rejouables avec la même clé, refusées dans le mauvais état, sans crédit", { skip }, async () => {
  const o = owner("pause");
  const acc = access("pro", { creditLimit: 1 });
  const id = await draft(o);
  const early = await store.pause(o, id, `pause-${runId}-early`, acc);
  assert.ok(!early.ok && early.code === "invalid_state", "un brouillon ne se met pas en pause");
  assert.ok((await activateSupervision(o, id, `act-${runId}-p`, acc, { ...options, client: admin! })).ok);
  const first = await store.pause(o, id, `pause-${runId}-1`, acc);
  const again = await store.pause(o, id, `pause-${runId}-1`, acc);
  assert.ok(first.ok && again.ok && again.replay, JSON.stringify([first, again]));
  const resumed = await store.resume(o, id, `resume-${runId}-1`, acc);
  assert.ok(resumed.ok, JSON.stringify(resumed));
  assert.equal(await stateOf(o, id), "active");
  assert.equal((await store.creditStatus(o, acc)).used, 1, "pause et reprise ne coûtent aucun crédit de plus");
});

test("concurrence : deux activations simultanées avec une seule place active n'en laissent passer qu'une", { skip }, async () => {
  const o = owner("concurrence");
  const acc = access("pro", { activeLimit: 1, creditLimit: null });
  const a = await draft(o, "Veille A");
  const b = await draft(o, "Veille B");
  const [x, y] = await Promise.all([
    activateSupervision(o, a, `act-${runId}-ca`, acc, { ...options, client: admin! }),
    activateSupervision(o, b, `act-${runId}-cb`, acc, { ...options, client: admin! }),
  ]);
  const winners = [x, y].filter((result) => result.ok);
  assert.equal(winners.length, 1, JSON.stringify([x, y]));
  const loser = [x, y].find((result) => !result.ok);
  assert.ok(loser && !loser.ok && loser.code === "active_limit_reached");
  const { data } = await admin!.from("sv_supervisions").select("state").eq("owner_id", o).in("state", ["active", "initializing"]);
  assert.equal(data?.length, 1, "jamais deux places occupées");
});

test("suppression d'un brouillon : il disparaît, libère une place de brouillon ; une Supervision active ne se supprime pas", { skip }, async () => {
  const o = owner("suppression");
  const acc = access("pro", { creditLimit: null });
  const ids: string[] = [];
  for (let i = 0; i < DEFAULT_POLICY.maxDraftsPerOwner; i++) ids.push(await draft(o, `Brouillon ${i}`));
  const full = await store.createDraft(o, "De trop", initialScope({ name: "De trop", country: "NGA", objective: "securite" }));
  assert.ok(!full.ok && full.code === "draft_limit_reached");

  const removed = await store.deleteDraft(o, ids[0]);
  assert.ok(removed.ok, JSON.stringify(removed));
  assert.equal(await store.getSupervision(o, ids[0]), null, "une Supervision supprimée n'existe plus pour le compte");
  assert.ok(!(await store.listSupervisions(o)).some((entry) => entry.id === ids[0]));
  assert.ok((await store.createDraft(o, "Nouveau", initialScope({ name: "Nouveau", country: "NGA", objective: "securite" }))).ok, "la place de brouillon est libérée");
  const again = await store.deleteDraft(o, ids[0]);
  assert.ok(!again.ok && again.code === "not_found");

  assert.ok((await activateSupervision(o, ids[1], `act-${runId}-del`, acc, { ...options, client: admin! })).ok);
  const refused = await store.deleteDraft(o, ids[1]);
  assert.ok(!refused.ok && refused.code === "invalid_state" && refused.detail.state === "active", JSON.stringify(refused));
});

test("isolation : un autre compte ne peut ni activer, ni mettre en pause, ni supprimer ; il n'apprend même pas que la Supervision existe", { skip }, async () => {
  const a = owner("iso-a");
  const b = owner("iso-b");
  const acc = access("pro", { creditLimit: null });
  const id = await draft(a);
  const activated = await activateSupervision(b, id, `act-${runId}-iso`, acc, { ...options, client: admin! });
  assert.ok(!activated.ok && activated.code === "not_found", JSON.stringify(activated));
  const removed = await store.deleteDraft(b, id);
  assert.ok(!removed.ok && removed.code === "not_found");
  assert.equal(await stateOf(a, id), "draft", "rien n'a bougé");
  assert.ok((await activateSupervision(a, id, `act-${runId}-iso2`, acc, { ...options, client: admin! })).ok);
  const paused = await store.pause(b, id, `pause-${runId}-iso`, acc);
  assert.ok(!paused.ok && paused.code === "not_found");
});
