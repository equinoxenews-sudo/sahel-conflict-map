// Tests d'INTÉGRATION de la collecte programmée : base de PRÉPRODUCTION seulement. AUCUN accès réseau (flux simulés).
//   npm run test:staging

import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import type { FeedItem } from "../../lib/rss";
import { collectScheduled } from "../../lib/supervision/collect/schedule";
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

const T0 = new Date("2026-11-10T06:00:00Z");
const minutesLater = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);
const item = (slug: string, title: string): FeedItem => ({ title, url: `https://test.example.com/${runId}/${slug}`, domain: "test.example.com", publishedAt: "2026-11-09T08:00:00.000Z", imageUrl: null, excerpt: "" });
const feed = async () => [item("convoi", "Nigeria : attaque contre un convoi militaire - Journal Test")];

after(async () => {
  if (!admin) return;
  for (const id of owners) {
    await admin.from("sv_operation_ledger").delete().eq("owner_id", id);
    await admin.from("sv_supervisions").delete().eq("owner_id", id);
  }
  await admin.from("sv_items").delete().like("url", `https://test.example.com/${runId}/%`);
});

async function supervision(label: string, state: string): Promise<{ owner: string; id: string }> {
  const owner = `it-sched-${runId}-${label}`;
  owners.push(owner);
  const created = await store.createDraft(owner, `Veille ${label}`, initialScope({ name: `Veille ${label}`, country: "NGA", objective: "securite" }));
  assert.ok(created.ok, JSON.stringify(created));
  if (!created.ok) throw new Error("création impossible");
  if (state !== "draft") {
    const { error } = await admin!.from("sv_supervisions").update({ state }).eq("id", created.supervision_id);
    assert.equal(error, null, error?.message);
  }
  return { owner, id: created.supervision_id };
}

test("l'exécution programmée ne collecte que les Supervisions en état de collecter, avec le déclencheur « planifiée »", { skip }, async () => {
  const active = await supervision("active", "active");
  const initializing = await supervision("init", "initializing");
  const draft = await supervision("draft", "draft");
  const paused = await supervision("paused", "paused");
  const all = [active.id, initializing.id, draft.id, paused.id];

  const report = await collectScheduled({ db: admin!, now: T0, only: all, deps: { fetchFeed: feed } });
  assert.deepEqual([report.considered, report.collected, report.skipped, report.failed.length, report.stoppedEarly], [2, 2, 0, 0, false], JSON.stringify(report));

  const { data: runs } = await admin!.from("sv_collection_runs").select("supervision_id, trigger, status").in("supervision_id", all);
  assert.equal(runs?.length, 2, "brouillon et pause : aucun passage");
  assert.ok((runs ?? []).every((run) => run.trigger === "scheduled" && run.status === "ok"));
  assert.ok(!(runs ?? []).some((run) => run.supervision_id === draft.id || run.supervision_id === paused.id));
});

test("une seconde exécution trop proche ne recollecte rien (écart de 3 h appliqué par la base) ; 3 h plus tard elle recollecte sans rien dupliquer", { skip }, async () => {
  const a = await supervision("again-a", "active");
  const b = await supervision("again-b", "active");
  const only = [a.id, b.id];
  const first = await collectScheduled({ db: admin!, now: T0, only, deps: { fetchFeed: feed } });
  assert.equal(first.collected, 2, JSON.stringify(first));

  const soon = await collectScheduled({ db: admin!, now: minutesLater(60), only, deps: { fetchFeed: feed } });
  assert.deepEqual([soon.collected, soon.skipped, soon.failed.length], [0, 2, 0], "trop proche : normal, pas une erreur");

  const later = await collectScheduled({ db: admin!, now: minutesLater(181), only, deps: { fetchFeed: feed } });
  assert.deepEqual([later.collected, later.skipped], [2, 0], JSON.stringify(later));
  const { count } = await admin!.from("sv_matches").select("item_id", { count: "exact", head: true }).in("supervision_id", only);
  assert.equal(count, 2, "la même publication n'est pas rattachée deux fois à la même Supervision");
});

test("limite de temps ou de nombre : l'exécution s'arrête proprement et le reste attend la suivante, qui reprend par les plus anciennes", { skip }, async () => {
  const a = await supervision("limit-a", "active");
  const b = await supervision("limit-b", "active");
  const c = await supervision("limit-c", "active");
  const only = [a.id, b.id, c.id];

  const none = await collectScheduled({ db: admin!, now: T0, only, timeBudgetMs: 0, deps: { fetchFeed: feed } });
  assert.deepEqual([none.collected, none.stoppedEarly, none.deferred], [0, true, 3], "budget de temps épuisé : rien n'est lancé, tout est reporté");

  const one = await collectScheduled({ db: admin!, now: T0, only, batchLimit: 1, deps: { fetchFeed: feed } });
  assert.deepEqual([one.collected, one.stoppedEarly, one.deferred], [1, true, 2]);

  // La suivante traite les deux restantes d'abord (jamais collectées), la première étant maintenant la plus récente.
  const next = await collectScheduled({ db: admin!, now: minutesLater(5), only, batchLimit: 2, deps: { fetchFeed: feed } });
  assert.equal(next.collected, 2, JSON.stringify(next));
  const { data: runs } = await admin!.from("sv_collection_runs").select("supervision_id").in("supervision_id", only).eq("status", "ok");
  assert.equal(new Set((runs ?? []).map((run) => run.supervision_id)).size, 3, "aucune Supervision n'est oubliée");
});

test("une Supervision en panne n'empêche pas les autres d'être collectées", { skip }, async () => {
  const ok = await supervision("panne-ok", "active");
  const broken = await supervision("panne-ko", "active");
  // Zone sans requête possible : on remplace le périmètre de l'une par un cercle (non pris en charge par la collecte).
  const circle = { primaryZone: { kind: "circle", lat: 10, lon: 8, radiusKm: 50 }, objective: "securite", countries: [], sources: [], keywords: [], entities: [] };
  const version = await admin!.from("sv_scope_versions").insert({ supervision_id: broken.id, version_no: 2, scope: circle, estimate: {}, is_major: false, major_reasons: [], origin: "minor_change", effective_at: T0.toISOString() }).select("id").single();
  assert.equal(version.error, null, version.error?.message);
  await admin!.from("sv_supervisions").update({ current_scope_version_id: version.data!.id }).eq("id", broken.id);

  const report = await collectScheduled({ db: admin!, now: T0, only: [ok.id, broken.id], deps: { fetchFeed: feed } });
  assert.equal(report.collected, 1, JSON.stringify(report));
  assert.deepEqual(report.failed.map((entry) => [entry.id, entry.reason]), [[broken.id, "no_queries"]], "la panne est signalée avec sa raison, sans rien bloquer");
});
