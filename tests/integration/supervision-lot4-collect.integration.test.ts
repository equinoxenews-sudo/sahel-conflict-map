// Tests d'INTÉGRATION de la collecte (sans IA) : base de PRÉPRODUCTION seulement. AUCUN accès réseau : les flux sont simulés.
//   npm run test:staging
// Il faut avoir exécuté supabase/supervision-lot4-collection.sql dans la préproduction.

import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import type { FeedItem } from "../../lib/rss";
import { collectForSupervision } from "../../lib/supervision/collect/run";
import type { ScopeSnapshot } from "../../lib/supervision/core/majorChange";
import * as store from "../../lib/supervision/core/store";
import { loadBoardData } from "../../lib/supervision/data/board";

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
  const id = `it-collect-${runId}-${label}`;
  owners.push(id);
  return id;
};

const snap: ScopeSnapshot = {
  scope: { primaryZone: { kind: "countries", codes: ["NGA"] }, objective: "securite", countries: ["NGA"], sources: [], keywords: [], entities: [] },
  estimate: { volumePerMonth: null, volumeConfidence: "unknown", aiCostUsdPerMonth: null, costConfidence: "unknown" },
};
async function draft(ownerId: string) {
  const r = await store.createDraft(ownerId, "Veille de test", snap);
  assert.ok(r.ok, JSON.stringify(r));
  return r.supervision_id;
}

const NOW = new Date("2026-11-10T12:00:00Z");
const item = (slug: string, title: string, publishedAt: string): FeedItem => ({ title, url: `https://test.example.com/${runId}/${slug}`, domain: "test.example.com", publishedAt, imageUrl: null, excerpt: "" });
const GOOD = item("convoi", "Nigeria : attaque contre un convoi militaire - Journal Test", "2026-11-09T08:00:00.000Z");
const OTHER_COUNTRY = item("niger", "Attaque au Niger : trois morts - Journal Test", "2026-11-09T09:00:00.000Z");
const TOO_OLD = item("vieux", "Nigeria : attaque ancienne - Journal Test", "2026-08-01T09:00:00.000Z");
const feed = async () => [GOOD, OTHER_COUNTRY, TOO_OLD];

before(async () => {
  if (skip || !admin) return;
  const { error } = await admin.from("sv_collection_runs").select("id").limit(1);
  if (error) throw new Error(`La préproduction n'a pas les tables de la collecte (${error.message}). Exécute supabase/supervision-lot4-collection.sql dans le SQL Editor de equinoxe-staging.`);
});

after(async () => {
  if (!admin) return;
  for (const id of owners) {
    await admin.from("sv_operation_ledger").delete().eq("owner_id", id);
    await admin.from("sv_supervisions").delete().eq("owner_id", id); // supprime journal et rattachements (cascade)
  }
  await admin.from("sv_items").delete().like("url", `https://test.example.com/${runId}/%`);
});

test("premier passage : seules les publications qui correspondent sont rangées, avec leur raison, et le journal le dit", { skip }, async () => {
  const o = owner("first");
  const id = await draft(o);
  const out = await collectForSupervision(o, id, { trigger: "manual", deps: { db: admin!, fetchFeed: feed, now: NOW } });
  assert.ok(out.ok, JSON.stringify(out));
  if (!out.ok) return;
  assert.equal(out.status, "ok");
  assert.equal(out.stats.matched, 1);
  assert.equal(out.stats.newItems, 1);
  assert.equal(out.stats.newMatches, 1);
  assert.equal(out.stats.rejected, 1, "l'article sur le Niger est écarté");
  assert.equal(out.stats.skipped.too_old, 1, "la publication trop ancienne est écartée, comptée une seule fois même si plusieurs recherches la ramènent");
  assert.ok(out.stats.fetched >= 3 * 2, "« fetched » compte les remontées de chaque recherche");
  const { data: links } = await admin!.from("sv_matches").select("reason, theme, sv_items(title, source_name, url)").eq("supervision_id", id);
  assert.equal(links?.length, 1);
  assert.match(String(links?.[0].reason), /Cite « Nigeria »/);
  const stored = links?.[0].sv_items as unknown as { title: string; source_name: string };
  assert.equal(stored.title, "Nigeria : attaque contre un convoi militaire");
  assert.equal(stored.source_name, "Journal Test");
  const { data: runs } = await admin!.from("sv_collection_runs").select("status, trigger, finished_at, queries").eq("supervision_id", id);
  assert.equal(runs?.length, 1);
  assert.equal(runs?.[0].status, "ok");
  assert.ok(runs?.[0].finished_at);
  assert.ok((runs?.[0].queries as string[]).length >= 2);
});

test("intervalle minimal : un second passage trop proche est refusé avec le délai restant ; plus tard il ne duplique rien", { skip }, async () => {
  const o = owner("again");
  const id = await draft(o);
  const first = await collectForSupervision(o, id, { trigger: "manual", deps: { db: admin!, fetchFeed: feed, now: NOW } });
  assert.ok(first.ok);
  const soon = await collectForSupervision(o, id, { trigger: "manual", deps: { db: admin!, fetchFeed: feed, now: new Date(NOW.getTime() + 5 * 60_000) } });
  assert.ok(!soon.ok && soon.code === "too_soon", JSON.stringify(soon));
  if (!soon.ok) assert.ok(Number(soon.detail.retry_after_seconds) > 0 && Number(soon.detail.retry_after_seconds) <= 600);
  const later = await collectForSupervision(o, id, { trigger: "manual", deps: { db: admin!, fetchFeed: feed, now: new Date(NOW.getTime() + 16 * 60_000) } });
  assert.ok(later.ok, JSON.stringify(later));
  if (!later.ok) return;
  assert.equal(later.stats.matched, 1);
  assert.equal(later.stats.newItems, 0, "idempotent : rien de nouveau");
  assert.equal(later.stats.newMatches, 0);
  const { count } = await admin!.from("sv_matches").select("item_id", { count: "exact", head: true }).eq("supervision_id", id);
  assert.equal(count, 1);
});

test("concurrence : deux passages lancés ensemble — un seul s'exécute", { skip }, async () => {
  const o = owner("race");
  const id = await draft(o);
  const results = await Promise.all(Array.from({ length: 4 }, () => collectForSupervision(o, id, { trigger: "manual", deps: { db: admin!, fetchFeed: feed, now: NOW } })));
  assert.equal(results.filter((r) => r.ok).length, 1, JSON.stringify(results.map((r) => (r.ok ? "ok" : r.code))));
  assert.ok(results.filter((r) => !r.ok).every((r) => !r.ok && (r.code === "too_soon" || r.code === "already_running")));
  const { count } = await admin!.from("sv_collection_runs").select("id", { count: "exact", head: true }).eq("supervision_id", id);
  assert.equal(count, 1, "une seule ligne de journal");
});

test("passage déjà en cours : refusé tant qu'il n'a pas plus de 10 minutes", { skip }, async () => {
  const o = owner("running");
  const id = await draft(o);
  await admin!.from("sv_collection_runs").insert({ supervision_id: id, trigger: "manual", status: "running", started_at: NOW.toISOString() });
  const blocked = await collectForSupervision(o, id, { trigger: "manual", deps: { db: admin!, fetchFeed: feed, now: new Date(NOW.getTime() + 3 * 60_000) } });
  assert.ok(!blocked.ok && blocked.code === "already_running");
  const stale = await collectForSupervision(o, id, { trigger: "manual", deps: { db: admin!, fetchFeed: feed, now: new Date(NOW.getTime() + 11 * 60_000) } });
  assert.ok(stale.ok, "un passage « en cours » depuis plus de 10 minutes est considéré comme mort");
});

test("isolation : un autre compte ne peut pas lancer ni lire la collecte de cette Supervision", { skip }, async () => {
  const a = owner("iso-a");
  const b = owner("iso-b");
  const id = await draft(a);
  const out = await collectForSupervision(b, id, { trigger: "manual", deps: { db: admin!, fetchFeed: feed, now: NOW } });
  assert.ok(!out.ok && out.code === "not_found");
  const { count } = await admin!.from("sv_collection_runs").select("id", { count: "exact", head: true }).eq("supervision_id", id);
  assert.equal(count, 0, "aucune ligne de journal pour un refus d'accès");
});

test("flux en panne : passage partiel (jamais présenté comme complet) ; plus rien ne répond : échec", { skip }, async () => {
  const o = owner("partial");
  const id = await draft(o);
  let calls = 0;
  const half = async () => (calls++ % 2 === 0 ? [GOOD] : []);
  const partial = await collectForSupervision(o, id, { trigger: "manual", deps: { db: admin!, fetchFeed: half, now: NOW } });
  assert.ok(partial.ok && partial.status === "partial", JSON.stringify(partial));
  const o2 = owner("down");
  const id2 = await draft(o2);
  const down = await collectForSupervision(o2, id2, { trigger: "manual", deps: { db: admin!, fetchFeed: async () => [], now: NOW } });
  assert.ok(down.ok && down.status === "failed", JSON.stringify(down));
  const { data } = await admin!.from("sv_collection_runs").select("status, error").eq("supervision_id", id2);
  assert.equal(data?.[0].status, "failed");
  assert.ok(data?.[0].error);
});

test("une Supervision en lecture seule ne lance pas de collecte", { skip }, async () => {
  const o = owner("readonly");
  const id = await draft(o);
  await admin!.from("sv_supervisions").update({ state: "read_only_grace" }).eq("id", id);
  const out = await collectForSupervision(o, id, { trigger: "manual", deps: { db: admin!, fetchFeed: feed, now: NOW } });
  assert.ok(!out.ok && out.code === "read_only", JSON.stringify(out));
});

test("tableau de bord : les publications collectées apparaissent dans les événements, avec raison, sans priorité ni vérification inventées", { skip }, async () => {
  const o = owner("board");
  const id = await draft(o);
  await collectForSupervision(o, id, { trigger: "manual", deps: { db: admin!, fetchFeed: feed, now: NOW } });
  const data = await loadBoardData(snap, NOW, admin!, id);
  const publications = data.events.filter((e) => e.kind === "publication");
  assert.equal(publications.length, 1);
  assert.equal(data.coverage.publications, 1);
  const [event] = publications;
  assert.equal(event.priority, "information");
  assert.equal(event.verification, "signalement");
  assert.match(event.reason ?? "", /Cite « Nigeria »/);
  assert.ok(event.url?.startsWith("https://test.example.com/"));
  // Une autre Supervision du même pays ne voit pas ce rattachement.
  const other = await draft(owner("board-other"));
  assert.equal((await loadBoardData(snap, NOW, admin!, other)).events.filter((e) => e.kind === "publication").length, 0);
});

test("sécurité : la clé publique n'atteint ni les publications, ni les rattachements, ni le journal, ni la fonction d'ouverture", { skip }, async () => {
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  for (const table of ["sv_items", "sv_matches", "sv_collection_runs"]) {
    const { data, error } = await anon.from(table).select("*").limit(1);
    assert.ok(error || (data ?? []).length === 0, `${table} lisible avec la clé publique`);
  }
  const rpc = await anon.rpc("sv_begin_collection", { p_owner: "x", p_supervision_id: "00000000-0000-0000-0000-000000000000", p_trigger: "manual" });
  assert.ok(rpc.error, "fonction exécutable avec la clé publique");
});
