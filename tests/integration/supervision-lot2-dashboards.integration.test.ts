// Tests d'INTÉGRATION du tableau de bord enregistré côté serveur : base de PRÉPRODUCTION seulement (voir le garde-fou ci-dessous).
//   npm run test:staging
// Il faut avoir exécuté supabase/supervision-lot1.sql PUIS supabase/supervision-lot2-dashboards.sql dans la préproduction.

import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { MAX_DASHBOARD_BYTES, getDashboard, getDashboardRevision, listDashboardRevisions, saveDashboard } from "../../lib/supervision/core/dashboards";
import type { ScopeSnapshot } from "../../lib/supervision/core/majorChange";
import * as store from "../../lib/supervision/core/store";
import { addWidget, emptyState, exampleState } from "../../lib/supervision/dashboard/state";

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
  const id = `it-dash-${runId}-${label}`;
  owners.push(id);
  return id;
};
const snap: ScopeSnapshot = {
  scope: { primaryZone: { kind: "countries", codes: ["BEN"] }, objective: "securite", countries: ["BEN"], sources: [], keywords: [], entities: [] },
  estimate: { volumePerMonth: null, volumeConfidence: "unknown", aiCostUsdPerMonth: null, costConfidence: "unknown" },
};
async function draft(ownerId: string) {
  const r = await store.createDraft(ownerId, "Veille de test", snap);
  assert.ok(r.ok, JSON.stringify(r));
  return r.supervision_id;
}

before(async () => {
  if (skip || !admin) return;
  const { error } = await admin.from("sv_dashboards").select("revision").limit(1);
  if (error) throw new Error(`La préproduction n'a pas la table des tableaux de bord (${error.message}). Exécute supabase/supervision-lot2-dashboards.sql dans le SQL Editor de equinoxe-staging.`);
});

after(async () => {
  if (!admin) return;
  for (const id of owners) {
    await admin.from("sv_operation_ledger").delete().eq("owner_id", id);
    await admin.from("sv_supervisions").delete().eq("owner_id", id); // supprime aussi tableaux de bord et révisions (cascade)
  }
});

test("première sauvegarde, relecture identique, puis révision suivante", { skip }, async () => {
  const o = owner("base");
  const id = await draft(o);
  assert.deepEqual(await getDashboard(o, id), { revision: 0, state: null, savedAt: null }, "jamais enregistré : tableau vierge");
  const first = exampleState();
  const saved = await saveDashboard(o, id, 0, first);
  assert.ok(saved.ok && saved.revision === 1, JSON.stringify(saved));
  const read = await getDashboard(o, id);
  assert.equal(read?.revision, 1);
  assert.deepEqual(read?.state, first, "exactement ce qui a été enregistré");
  const next = addWidget(first, "notes").state;
  const second = await saveDashboard(o, id, 1, next);
  assert.ok(second.ok && second.revision === 2);
  assert.equal(Object.keys((await getDashboard(o, id))!.state!.widgets).length, 7);
});

test("conflit : une sauvegarde fondée sur une révision périmée est refusée, avec la version du serveur, et rien n'est écrasé", { skip }, async () => {
  const o = owner("conflit");
  const id = await draft(o);
  const deviceA = exampleState();
  assert.ok((await saveDashboard(o, id, 0, deviceA)).ok);
  // Un autre appareil, resté sur la révision 0, tente d'enregistrer sa propre version.
  const stale = await saveDashboard(o, id, 0, emptyState());
  assert.ok(!stale.ok && stale.code === "revision_conflict", JSON.stringify(stale));
  const detail = stale.detail as { current_revision: number; current_state: unknown };
  assert.equal(detail.current_revision, 1);
  assert.ok(detail.current_state, "la version du serveur est renvoyée pour que l'utilisateur choisisse");
  assert.deepEqual((await getDashboard(o, id))?.state, deviceA, "la version de l'appareil A n'a pas été écrasée");
  // Après avoir relu la révision 1, l'autre appareil peut enregistrer.
  assert.ok((await saveDashboard(o, id, 1, emptyState())).ok);
});

test("concurrence : six sauvegardes simultanées sur la même révision — une seule passe, les autres sont refusées", { skip }, async () => {
  const o = owner("course");
  const id = await draft(o);
  const results = await Promise.all(Array.from({ length: 6 }, (_, i) => saveDashboard(o, id, 0, addWidget(emptyState(), i % 2 ? "map" : "feed", { title: `Version ${i}` }).state)));
  assert.equal(results.filter((r) => r.ok).length, 1, JSON.stringify(results.map((r) => (r.ok ? "ok" : r.code))));
  assert.ok(results.filter((r) => !r.ok).every((r) => !r.ok && r.code === "revision_conflict"));
  assert.equal((await getDashboard(o, id))?.revision, 1);
});

test("isolation A/B : un autre compte ne lit, n'enregistre ni ne consulte l'historique du tableau de bord d'autrui", { skip }, async () => {
  const a = owner("iso-a");
  const b = owner("iso-b");
  const idA = await draft(a);
  assert.ok((await saveDashboard(a, idA, 0, exampleState())).ok);
  assert.equal(await getDashboard(b, idA), null);
  const write = await saveDashboard(b, idA, 1, emptyState());
  assert.ok(!write.ok && write.code === "not_found");
  assert.deepEqual(await listDashboardRevisions(b, idA), []);
  assert.equal(await getDashboardRevision(b, idA, 1), null);
  assert.equal((await getDashboard(a, idA))?.revision, 1, "le tableau de A n'a pas bougé");
});

test("historique : les 20 dernières révisions sont gardées ; une ancienne révision se relit et se restaure comme une nouvelle révision", { skip }, async () => {
  const o = owner("histoire");
  const id = await draft(o);
  let state = emptyState();
  for (let i = 0; i < 22; i++) {
    state = addWidget(state, "notes", { title: `Note ${i + 1}` }).state;
    const saved = await saveDashboard(o, id, i, state);
    assert.ok(saved.ok, `révision ${i + 1} : ${JSON.stringify(saved)}`);
  }
  const revisions = await listDashboardRevisions(o, id);
  assert.equal(revisions.length, 20);
  assert.equal(revisions[0].revision, 22);
  assert.equal(revisions[revisions.length - 1].revision, 3, "les révisions 1 et 2 ont été élaguées");
  const old = await getDashboardRevision(o, id, 5);
  assert.equal(Object.keys(old!.widgets).length, 5, "la révision 5 avait cinq modules");
  const restored = await saveDashboard(o, id, 22, old);
  assert.ok(restored.ok && restored.revision === 23);
  assert.equal(Object.keys((await getDashboard(o, id))!.state!.widgets).length, 5);
});

test("une Supervision en lecture seule (période de grâce) refuse toute modification du tableau", { skip }, async () => {
  const o = owner("lecture-seule");
  const id = await draft(o);
  assert.ok((await saveDashboard(o, id, 0, exampleState())).ok);
  await admin!.from("sv_supervisions").update({ state: "read_only_grace" }).eq("id", id);
  const refused = await saveDashboard(o, id, 1, emptyState());
  assert.ok(!refused.ok && refused.code === "read_only", JSON.stringify(refused));
});

test("documents invalides ou démesurés : refusés avant d'atteindre la base", { skip }, async () => {
  const o = owner("invalide");
  const id = await draft(o);
  for (const bad of [null, "texte", {}, { version: 1 }, { ...exampleState(), layouts: { desktop: [], tablet: null, mobile: null } }]) {
    const r = await saveDashboard(o, id, 0, bad);
    assert.ok(!r.ok && (r.code === "invalid_state_document" || r.code === "too_large"), JSON.stringify(bad)?.slice(0, 40));
  }
  const huge = { ...exampleState(), padding: "x".repeat(MAX_DASHBOARD_BYTES) };
  const tooLarge = await saveDashboard(o, id, 0, huge);
  assert.ok(!tooLarge.ok && tooLarge.code === "too_large");
  assert.equal((await getDashboard(o, id))?.revision, 0, "rien n'a été écrit");
});

test("sécurité : les clés publiques n'atteignent ni les tableaux de bord ni la fonction d'enregistrement", { skip }, async () => {
  const o = owner("securite");
  const id = await draft(o);
  assert.ok((await saveDashboard(o, id, 0, exampleState())).ok);
  const pub = createClient(url, anonKey, { auth: { persistSession: false } });
  const read = await pub.from("sv_dashboards").select("state").limit(1);
  assert.ok(read.error !== null || (read.data ?? []).length === 0);
  const rpc = await pub.rpc("sv_save_dashboard", { p_owner: o, p_supervision_id: id, p_expected_revision: 1, p_state: {} });
  assert.ok(rpc.error !== null);
});
