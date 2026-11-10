// Tests d'INTÉGRATION de la ré-évaluation des rattachements : base de PRÉPRODUCTION seulement. AUCUN accès réseau (flux simulés).
//   npm run test:staging
// Il faut avoir exécuté supabase/supervision-lot5-reevaluation.sql dans la préproduction.

import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import type { FeedItem } from "../../lib/rss";
import { collectForSupervision } from "../../lib/supervision/collect/run";
import type { ScopeSnapshot } from "../../lib/supervision/core/majorChange";
import { initialScope } from "../../lib/supervision/core/scope";
import { applyScopeEdit, editOf } from "../../lib/supervision/core/scopeEdit";
import * as store from "../../lib/supervision/core/store";
import { loadBoardData } from "../../lib/supervision/data/board";

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

const T0 = new Date("2026-11-10T12:00:00Z");
const minutesLater = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);
const item = (slug: string, title: string): FeedItem => ({ title, url: `https://test.example.com/${runId}/${slug}`, domain: "test.example.com", publishedAt: "2026-11-09T08:00:00.000Z", imageUrl: null, excerpt: "" });
const feed = async () => [item("convoi", "Nigeria : attaque contre un convoi militaire - Journal Test"), item("foot", "Nigeria : attaque contre un stade de football - Journal Test")];

before(async () => {
  if (skip || !admin) return;
  const { error } = await admin.from("sv_matches").select("hidden_at").limit(1);
  if (error) throw new Error(`La préproduction n'a pas la colonne de masquage (${error.message}). Exécute supabase/supervision-lot5-reevaluation.sql dans le SQL Editor de equinoxe-staging.`);
});

after(async () => {
  if (!admin) return;
  for (const id of owners) {
    await admin.from("sv_operation_ledger").delete().eq("owner_id", id);
    await admin.from("sv_supervisions").delete().eq("owner_id", id);
  }
  await admin.from("sv_items").delete().like("url", `https://test.example.com/${runId}/%`);
});

test("changer le périmètre masque les anciens rattachements qui ne correspondent plus, sans rien supprimer ; l'assouplir les rétablit", { skip }, async () => {
  const o = `it-reeval-${runId}`;
  owners.push(o);
  const created = await store.createDraft(o, "Veille de test", initialScope({ name: "Veille de test", country: "NGA", objective: "securite" }));
  assert.ok(created.ok, JSON.stringify(created));
  if (!created.ok) return;
  const id = created.supervision_id;
  const access = await store.loadAccess(o, "owner");
  const current = async () => (await store.getScopeSnapshot(o, id, (await store.getSupervision(o, id))!.currentScopeVersionId!)) as ScopeSnapshot;
  const visibleCount = async (when: Date) => (await loadBoardData(await current(), when, admin!, id)).coverage.publications;
  const rowCount = async () => (await admin!.from("sv_matches").select("item_id", { count: "exact", head: true }).eq("supervision_id", id)).count;

  // 1. Premier passage : les deux publications correspondent.
  const first = await collectForSupervision(o, id, { trigger: "manual", deps: { db: admin!, fetchFeed: feed, now: T0 } });
  assert.ok(first.ok, JSON.stringify(first));
  if (!first.ok) return;
  assert.equal(first.stats.reevaluationAvailable, true);
  assert.equal(first.stats.hidden, 0);
  assert.equal(await visibleCount(T0), 2);

  // 2. Une exclusion est ajoutée : au passage suivant, la publication de football est masquée (la ligne reste en base).
  const withExclusion = applyScopeEdit(await current(), { ...editOf(await current()), exclusions: ["football"] });
  const changed = await store.proposeScopeChange(o, id, `key-${runId}-a`, withExclusion, access);
  assert.ok("outcome" in changed && changed.outcome.ok, JSON.stringify(changed));
  const second = await collectForSupervision(o, id, { trigger: "manual", deps: { db: admin!, fetchFeed: feed, now: minutesLater(30) } });
  assert.ok(second.ok, JSON.stringify(second));
  if (!second.ok) return;
  assert.equal(second.stats.hidden, 1);
  assert.equal(second.stats.newMatches, 0, "rien de nouveau : la même publication n'est pas rattachée deux fois");
  assert.equal(await rowCount(), 2, "rien n'est supprimé");
  assert.equal(await visibleCount(minutesLater(30)), 1, "le tableau ne lit que les rattachements visibles");
  const { data: hidden } = await admin!.from("sv_matches").select("hidden_at, hidden_reason").eq("supervision_id", id).not("hidden_at", "is", null);
  assert.equal(hidden?.length, 1);
  assert.match(String(hidden?.[0].hidden_reason), /^Exclu : « football »/);

  // 3. Idempotence : un passage de plus avec le même périmètre ne masque ni ne rétablit rien.
  const third = await collectForSupervision(o, id, { trigger: "manual", deps: { db: admin!, fetchFeed: feed, now: minutesLater(60) } });
  assert.ok(third.ok);
  if (third.ok) assert.deepEqual([third.stats.hidden, third.stats.restored], [0, 0]);

  // 4. L'exclusion est retirée : la publication masquée est rétablie, avec son jugement actuel.
  const without = applyScopeEdit(await current(), { ...editOf(await current()), exclusions: [] });
  const relaxed = await store.proposeScopeChange(o, id, `key-${runId}-b`, without, access);
  assert.ok("outcome" in relaxed && relaxed.outcome.ok, JSON.stringify(relaxed));
  const fourth = await collectForSupervision(o, id, { trigger: "manual", deps: { db: admin!, fetchFeed: feed, now: minutesLater(90) } });
  assert.ok(fourth.ok, JSON.stringify(fourth));
  if (!fourth.ok) return;
  assert.equal(fourth.stats.restored, 1);
  assert.equal(await visibleCount(minutesLater(90)), 2);
  const { data: stillHidden } = await admin!.from("sv_matches").select("item_id").eq("supervision_id", id).not("hidden_at", "is", null);
  assert.equal(stillHidden?.length, 0);
});
