// Tests d'INTÉGRATION de la modification du périmètre : base de PRÉPRODUCTION seulement. AUCUN accès réseau (flux simulés).
//   npm run test:staging
// Il faut avoir exécuté supabase/supervision-lot1.sql, supervision-lot4-collection.sql et supervision-lot4b-gazetteer.sql.

import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import type { FeedItem } from "../../lib/rss";
import { collectForSupervision } from "../../lib/supervision/collect/run";
import type { ScopeSnapshot } from "../../lib/supervision/core/majorChange";
import { applyScopeEdit, editOf } from "../../lib/supervision/core/scopeEdit";
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
  const id = `it-scope-${runId}-${label}`;
  owners.push(id);
  return id;
};

const NOW = new Date("2026-11-10T12:00:00Z");
const item = (slug: string, title: string): FeedItem => ({ title, url: `https://test.example.com/${runId}/${slug}`, domain: "test.example.com", publishedAt: "2026-11-09T08:00:00.000Z", imageUrl: null, excerpt: "" });
const CONVOY = item("convoi", "Nigeria : attaque contre un convoi militaire - Journal Test");
const PIPELINE = item("pipeline", "Nigeria : un pipeline visé près de Maiduguri - Journal Test");
const FOOTBALL = item("foot", "Nigeria : un pipeline visé avant un match de football - Journal Test");
const feed = async () => [CONVOY, PIPELINE, FOOTBALL];

after(async () => {
  if (!admin) return;
  for (const id of owners) {
    await admin.from("sv_operation_ledger").delete().eq("owner_id", id);
    await admin.from("sv_supervisions").delete().eq("owner_id", id);
  }
  await admin.from("sv_items").delete().like("url", `https://test.example.com/${runId}/%`);
});

test("un brouillon modifie librement son périmètre : nouvelle version, ancienne conservée, jamais majeur", { skip }, async () => {
  const o = owner("draft");
  const created = await store.createDraft(o, "Veille de test", initialScope({ name: "Veille de test", country: "NGA", objective: "securite" }));
  assert.ok(created.ok, JSON.stringify(created));
  if (!created.ok) return;
  const id = created.supervision_id;
  const first = await store.getSupervision(o, id);
  const v1 = created.scope_version_id;
  assert.equal(first?.currentScopeVersionId, v1);
  const current = (await store.getScopeSnapshot(o, id, v1)) as ScopeSnapshot;

  const next = applyScopeEdit(current, { ...editOf(current), keywords: ["pipeline"], entities: ["Maiduguri"], exclusions: ["football"] });
  const preview = await store.classifyProposal(o, id, next);
  assert.ok(preview);
  assert.equal(preview?.supervision.state, "draft");

  const access = await store.loadAccess(o, "owner");
  const result = await store.proposeScopeChange(o, id, `key-${runId}-1`, next, access);
  assert.ok("outcome" in result && result.outcome.ok, JSON.stringify(result));
  if (!("outcome" in result) || !result.outcome.ok) return;
  assert.equal(result.outcome.major, false, "brouillon : jamais majeur");

  const after1 = await store.getSupervision(o, id);
  assert.equal(after1?.currentScopeVersionId, result.outcome.scope_version_id);
  assert.notEqual(after1?.currentScopeVersionId, v1);
  const stored = (await store.getScopeSnapshot(o, id, after1!.currentScopeVersionId!)) as ScopeSnapshot;
  assert.deepEqual(stored.scope.keywords, ["pipeline"]);
  assert.deepEqual(stored.scope.exclusions, ["football"]);
  const old = (await store.getScopeSnapshot(o, id, v1)) as ScopeSnapshot;
  assert.deepEqual(old.scope.keywords, [], "l'ancienne version du périmètre est conservée telle quelle");

  // Rejouer la même opération avec la même clé ne crée pas de seconde version.
  const replay = await store.proposeScopeChange(o, id, `key-${runId}-1`, next, access);
  assert.ok("outcome" in replay && replay.outcome.ok && replay.outcome.replay, JSON.stringify(replay));
  const { data: versions } = await admin!.from("sv_scope_versions").select("version_no").eq("supervision_id", id);
  assert.equal(versions?.length, 2);
});

test("le nouveau périmètre gouverne la collecte suivante : mots-clés et entités à la place du vocabulaire par défaut, exclusions respectées", { skip }, async () => {
  const o = owner("collect");
  const created = await store.createDraft(o, "Veille de test", initialScope({ name: "Veille de test", country: "NGA", objective: "securite" }));
  assert.ok(created.ok);
  if (!created.ok) return;
  const id = created.supervision_id;
  const current = (await store.getScopeSnapshot(o, id, created.scope_version_id)) as ScopeSnapshot;
  const access = await store.loadAccess(o, "owner");
  const changed = await store.proposeScopeChange(o, id, `key-${runId}-2`, applyScopeEdit(current, { ...editOf(current), keywords: ["pipeline"], exclusions: ["football"] }), access);
  assert.ok("outcome" in changed && changed.outcome.ok, JSON.stringify(changed));

  const out = await collectForSupervision(o, id, { trigger: "manual", deps: { db: admin!, fetchFeed: feed, now: NOW } });
  assert.ok(out.ok, JSON.stringify(out));
  if (!out.ok) return;
  const { data: links } = await admin!.from("sv_matches").select("terms, sv_items(title)").eq("supervision_id", id);
  const titles = (links ?? []).map((link) => (link.sv_items as unknown as { title: string }).title);
  assert.deepEqual(titles, ["Nigeria : un pipeline visé près de Maiduguri"], "ni le convoi (mot-clé absent), ni le match de football (exclusion)");
});

test("un autre compte ne peut ni classer ni modifier ce périmètre (introuvable, sans révéler qu'il existe)", { skip }, async () => {
  const a = owner("a");
  const b = owner("b");
  const created = await store.createDraft(a, "Veille de A", initialScope({ name: "Veille de A", country: "NGA", objective: "securite" }));
  assert.ok(created.ok);
  if (!created.ok) return;
  const current = (await store.getScopeSnapshot(a, created.supervision_id, created.scope_version_id)) as ScopeSnapshot;
  const next = applyScopeEdit(current, { ...editOf(current), keywords: ["intrus"] });
  assert.equal(await store.classifyProposal(b, created.supervision_id, next), null);
  assert.equal(await store.getScopeSnapshot(b, created.supervision_id, created.scope_version_id), null);
  const stolen = await store.proposeScopeChange(b, created.supervision_id, `key-${runId}-3`, next, await store.loadAccess(b, "owner"));
  assert.ok("ok" in stolen && !stolen.ok && stolen.code === "not_found", JSON.stringify(stolen));
});
