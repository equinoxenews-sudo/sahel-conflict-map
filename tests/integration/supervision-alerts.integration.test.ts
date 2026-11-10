// Tests d'INTÉGRATION des décisions sur les alertes : base de PRÉPRODUCTION seulement. AUCUN accès réseau, aucune IA.
//   npm run test:staging
// Il faut avoir exécuté supabase/supervision-lot8-alerts.sql dans la préproduction.

import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { listAlertStates, setAlertStates } from "../../lib/supervision/alerts/store";
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

before(async () => {
  if (skip || !admin) return;
  const { error } = await admin.from("sv_alert_states").select("event_ref").limit(1);
  if (error) throw new Error(`La préproduction n'a pas la table des alertes (${error.message}). Exécute supabase/supervision-lot8-alerts.sql dans le SQL Editor de equinoxe-staging.`);
});

after(async () => {
  if (!admin) return;
  for (const id of owners) {
    await admin.from("sv_operation_ledger").delete().eq("owner_id", id);
    await admin.from("sv_supervisions").delete().eq("owner_id", id);
  }
});

async function draft(owner: string, name: string): Promise<string> {
  owners.push(owner);
  const created = await store.createDraft(owner, name, initialScope({ name, country: "NGA", objective: "securite" }));
  assert.ok(created.ok, JSON.stringify(created));
  if (!created.ok) throw new Error("brouillon non créé");
  return created.supervision_id;
}

const item = (eventRef: string, level: "critique" | "importante" = "importante") => ({ eventRef, level });

test("lue, conservée, masquée, rétablie : la décision est enregistrée avec son niveau, rejouer est sans effet, rétablir supprime la ligne", { skip }, async () => {
  const o = `it-alerts-${runId}-a`;
  const id = await draft(o, "Veille alertes A");

  assert.deepEqual(await listAlertStates(o, id), []);
  const read = await setAlertStates(o, id, "read", [item("a-1", "critique"), item("e-2")]);
  assert.ok(read.ok && read.applied === 2, JSON.stringify(read));
  const states = await listAlertStates(o, id);
  assert.deepEqual(states?.map((s) => [s.eventRef, s.status, s.level]).sort(), [["a-1", "read", "critique"], ["e-2", "read", "importante"]]);

  // Une nouvelle décision remplace la précédente (une seule ligne par alerte) et met à jour le niveau.
  await setAlertStates(o, id, "hidden", [item("a-1", "critique")]);
  await setAlertStates(o, id, "hidden", [item("a-1", "critique")]);
  const after1 = await listAlertStates(o, id);
  assert.equal(after1?.length, 2);
  assert.equal(after1?.find((s) => s.eventRef === "a-1")?.status, "hidden");
  await setAlertStates(o, id, "kept", [item("e-2", "critique")]);
  const kept = (await listAlertStates(o, id))?.find((s) => s.eventRef === "e-2");
  assert.deepEqual([kept?.status, kept?.level], ["kept", "critique"]);

  // Rétablir supprime la ligne : l'alerte est de nouveau « à traiter ».
  const restore = await setAlertStates(o, id, "new", [item("a-1", "critique")]);
  assert.ok(restore.ok);
  assert.deepEqual((await listAlertStates(o, id))?.map((s) => s.eventRef), ["e-2"]);
});

test("plafond de décisions : un ajout qui le dépasserait est refusé en entier ; remplacer une décision existante reste permis", { skip }, async () => {
  const o = `it-alerts-${runId}-b`;
  const id = await draft(o, "Veille alertes B");
  assert.ok((await setAlertStates(o, id, "read", [item("a-1"), item("a-2"), item("a-3")], { max: 3 })).ok);
  const over = await setAlertStates(o, id, "read", [item("a-4")], { max: 3 });
  assert.ok(!over.ok);
  if (!over.ok) {
    assert.equal(over.code, "limit_reached");
    assert.equal(over.detail.limit, 3);
  }
  assert.ok((await setAlertStates(o, id, "kept", [item("a-1")], { max: 3 })).ok, "remplacement permis au plafond");
  const mixed = await setAlertStates(o, id, "read", [item("a-2"), item("a-9")], { max: 3 });
  assert.ok(!mixed.ok, "un lot qui dépasse est refusé en entier");
  assert.equal((await listAlertStates(o, id))?.length, 3);
});

test("saisie invalide refusée par la base elle-même (statut, nombre d'éléments)", { skip }, async () => {
  const o = `it-alerts-${runId}-c`;
  const id = await draft(o, "Veille alertes C");
  const badStatus = await admin!.rpc("sv_set_alert_states", { p_owner: o, p_supervision_id: id, p_status: "deleted", p_items: [{ event_ref: "a-1", level: "critique" }] });
  assert.equal(badStatus.data?.code, "invalid_input");
  const notArray = await admin!.rpc("sv_set_alert_states", { p_owner: o, p_supervision_id: id, p_status: "read", p_items: { event_ref: "a-1" } });
  assert.equal(notArray.data?.code, "invalid_input");
  const tooMany = await admin!.rpc("sv_set_alert_states", { p_owner: o, p_supervision_id: id, p_status: "read", p_items: Array.from({ length: 101 }, (_, n) => ({ event_ref: `a-${n}`, level: "critique" })) });
  assert.equal(tooMany.data?.code, "invalid_input");
  assert.deepEqual(await listAlertStates(o, id), []);
});

test("isolation : un autre compte ne lit ni n'écrit rien, même en connaissant l'identifiant", { skip }, async () => {
  const alice = `it-alerts-${runId}-d1`;
  const bob = `it-alerts-${runId}-d2`;
  const id = await draft(alice, "Veille alertes D");
  owners.push(bob);
  await setAlertStates(alice, id, "read", [item("a-1")]);

  assert.equal(await listAlertStates(bob, id), null);
  const write = await setAlertStates(bob, id, "hidden", [item("a-1")]);
  assert.ok(!write.ok && write.code === "not_found");
  const restore = await setAlertStates(bob, id, "new", [item("a-1")]);
  assert.ok(!restore.ok && restore.code === "not_found");
  assert.deepEqual((await listAlertStates(alice, id))?.map((s) => [s.eventRef, s.status]), [["a-1", "read"]]);
});

test("lecture seule : la lecture reste possible, toute décision est refusée ; une Supervision supprimée n'existe plus", { skip }, async () => {
  const o = `it-alerts-${runId}-e`;
  const id = await draft(o, "Veille alertes E");
  await setAlertStates(o, id, "read", [item("a-1")]);

  await admin!.from("sv_supervisions").update({ state: "pending_deletion" }).eq("id", id);
  assert.equal((await listAlertStates(o, id))?.length, 1);
  for (const status of ["read", "kept", "hidden", "new"] as const) {
    const result = await setAlertStates(o, id, status, [item("a-1")]);
    assert.ok(!result.ok && result.code === "read_only", status);
  }
  await admin!.from("sv_supervisions").update({ state: "deleted" }).eq("id", id);
  assert.equal(await listAlertStates(o, id), null);
});

test("les décisions ne sont pas lisibles ni écrivables avec les clés publiques de la base (RLS)", { skip }, async () => {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  assert.ok(anon, "clé publique attendue dans .env.local pour ce test");
  const client = createClient(url, anon!, { auth: { persistSession: false } });
  const read = await client.from("sv_alert_states").select("event_ref").limit(1);
  assert.ok(read.error || (read.data ?? []).length === 0);
  const call = await client.rpc("sv_set_alert_states", { p_owner: "x", p_supervision_id: "00000000-0000-0000-0000-000000000000", p_status: "read", p_items: [] });
  assert.ok(call.error, "fonction non exécutable avec la clé publique");
});
