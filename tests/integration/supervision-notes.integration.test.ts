// Tests d'INTÉGRATION des notes : base de PRÉPRODUCTION seulement. AUCUN accès réseau, aucune IA.
//   npm run test:staging
// Il faut avoir exécuté supabase/supervision-lot7-notes.sql dans la préproduction.

import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { initialScope } from "../../lib/supervision/core/scope";
import * as store from "../../lib/supervision/core/store";
import { addNote, deleteNote, listNotes, updateNote } from "../../lib/supervision/core/notesStore";

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
const key = (suffix: string) => `note-${runId}-${suffix}`;

before(async () => {
  if (skip || !admin) return;
  const { error } = await admin.from("sv_notes").select("id").limit(1);
  if (error) throw new Error(`La préproduction n'a pas la table des notes (${error.message}). Exécute supabase/supervision-lot7-notes.sql dans le SQL Editor de equinoxe-staging.`);
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

test("ajout, lecture, filtre par publication, modification et suppression masquée", { skip }, async () => {
  const o = `it-notes-${runId}-a`;
  const id = await draft(o, "Veille notes A");

  const general = await addNote(o, id, key("g"), { body: "Note générale", eventRef: null, eventTitle: null });
  assert.ok(general.ok, JSON.stringify(general));
  const onEvent = await addNote(o, id, key("e"), { body: "Note sur une publication", eventRef: "p-abc123", eventTitle: "Titre de la publication" });
  assert.ok(onEvent.ok, JSON.stringify(onEvent));
  if (!general.ok || !onEvent.ok || !general.note || !onEvent.note) return;
  assert.equal(general.replay, false);
  assert.equal(general.note.revision, 1);

  const all = await listNotes(o, id);
  assert.equal(all?.length, 2);
  assert.equal(all?.[0].body, "Note sur une publication", "les plus récentes d'abord");
  const filtered = await listNotes(o, id, { eventRef: "p-abc123" });
  assert.deepEqual(filtered?.map((n) => n.body), ["Note sur une publication"]);
  assert.equal(filtered?.[0].eventTitle, "Titre de la publication");

  const edited = await updateNote(o, id, general.note.id, "Note générale corrigée", 1);
  assert.ok(edited.ok, JSON.stringify(edited));
  if (edited.ok) {
    assert.equal(edited.note?.revision, 2);
    assert.equal(edited.note?.body, "Note générale corrigée");
  }

  const removed = await deleteNote(o, id, onEvent.note.id);
  assert.ok(removed.ok && !removed.replay);
  assert.equal((await listNotes(o, id))?.length, 1, "la note supprimée disparaît de la liste");
  const { data: rows } = await admin!.from("sv_notes").select("id, deleted_at").eq("supervision_id", id);
  assert.equal(rows?.length, 2, "rien n'est effacé de la base");
  assert.equal(rows?.filter((r) => r.deleted_at).length, 1);
  const again = await deleteNote(o, id, onEvent.note.id);
  assert.ok(again.ok && again.replay, "supprimer deux fois est sans effet");
  const editDeleted = await updateNote(o, id, onEvent.note.id, "Trop tard", 1);
  assert.ok(!editDeleted.ok && editDeleted.code === "not_found");
});

test("la même clé ne crée jamais deux notes, y compris à deux clics simultanés ; une clé réutilisée avec un autre texte est refusée", { skip }, async () => {
  const o = `it-notes-${runId}-b`;
  const id = await draft(o, "Veille notes B");

  const results = await Promise.all([1, 2, 3, 4].map(() => addNote(o, id, key("dbl"), { body: "Un seul clic compte", eventRef: null, eventTitle: null })));
  assert.ok(results.every((r) => r.ok), JSON.stringify(results));
  assert.equal(results.filter((r) => r.ok && !r.replay).length, 1, "une seule création");
  assert.equal(new Set(results.map((r) => (r.ok ? r.note?.id : null))).size, 1, "toutes renvoient la même note");
  assert.equal((await listNotes(o, id))?.length, 1);

  const other = await addNote(o, id, key("dbl"), { body: "Un autre texte", eventRef: null, eventTitle: null });
  assert.ok(!other.ok && other.code === "idempotency_conflict");
});

test("verrou optimiste : une modification avec une révision périmée est refusée et ne détruit rien", { skip }, async () => {
  const o = `it-notes-${runId}-c`;
  const id = await draft(o, "Veille notes C");
  const created = await addNote(o, id, key("c"), { body: "Version 1", eventRef: null, eventTitle: null });
  assert.ok(created.ok && created.note);
  if (!created.ok || !created.note) return;
  const first = await updateNote(o, id, created.note.id, "Version 2", 1);
  assert.ok(first.ok);
  const stale = await updateNote(o, id, created.note.id, "Version écrasante", 1);
  assert.ok(!stale.ok);
  if (!stale.ok) {
    assert.equal(stale.code, "revision_conflict");
    assert.equal(stale.detail.current_revision, 2);
  }
  assert.equal((await listNotes(o, id))?.[0].body, "Version 2");
});

test("plafond : au-delà du nombre de notes autorisé, l'ajout est refusé ; supprimer une note libère une place", { skip }, async () => {
  const o = `it-notes-${runId}-d`;
  const id = await draft(o, "Veille notes D");
  const added: string[] = [];
  for (let n = 0; n < 3; n += 1) {
    const result = await addNote(o, id, key(`lim${n}`), { body: `Note ${n}`, eventRef: null, eventTitle: null }, { max: 3 });
    assert.ok(result.ok, JSON.stringify(result));
    if (result.ok && result.note) added.push(result.note.id);
  }
  const over = await addNote(o, id, key("lim3"), { body: "Une de trop", eventRef: null, eventTitle: null }, { max: 3 });
  assert.ok(!over.ok);
  if (!over.ok) {
    assert.equal(over.code, "limit_reached");
    assert.equal(over.detail.limit, 3);
  }
  await deleteNote(o, id, added[0]);
  const afterDelete = await addNote(o, id, key("lim4"), { body: "Place libérée", eventRef: null, eventTitle: null }, { max: 3 });
  assert.ok(afterDelete.ok, JSON.stringify(afterDelete));
});

test("isolation : un autre compte ne lit, n'ajoute, ne modifie ni ne supprime rien, même en connaissant les identifiants", { skip }, async () => {
  const alice = `it-notes-${runId}-e1`;
  const bob = `it-notes-${runId}-e2`;
  const id = await draft(alice, "Veille notes E");
  owners.push(bob);
  const created = await addNote(alice, id, key("e1"), { body: "Privée", eventRef: null, eventTitle: null });
  assert.ok(created.ok && created.note);
  if (!created.ok || !created.note) return;

  assert.equal(await listNotes(bob, id), null, "lecture refusée");
  const add = await addNote(bob, id, key("e2"), { body: "Intrusion", eventRef: null, eventTitle: null });
  assert.ok(!add.ok && add.code === "not_found");
  const edit = await updateNote(bob, id, created.note.id, "Intrusion", 1);
  assert.ok(!edit.ok && edit.code === "not_found");
  const del = await deleteNote(bob, id, created.note.id);
  assert.ok(!del.ok && del.code === "not_found");
  const mine = await listNotes(alice, id);
  assert.deepEqual(mine?.map((n) => [n.body, n.revision]), [["Privée", 1]]);
});

test("lecture seule : la lecture reste possible, toute écriture est refusée ; une Supervision supprimée n'existe plus", { skip }, async () => {
  const o = `it-notes-${runId}-f`;
  const id = await draft(o, "Veille notes F");
  const created = await addNote(o, id, key("f"), { body: "Avant la lecture seule", eventRef: null, eventTitle: null });
  assert.ok(created.ok && created.note);
  if (!created.ok || !created.note) return;

  await admin!.from("sv_supervisions").update({ state: "read_only_grace" }).eq("id", id);
  assert.equal((await listNotes(o, id))?.length, 1, "consultation permise");
  const add = await addNote(o, id, key("f2"), { body: "Refusée", eventRef: null, eventTitle: null });
  assert.ok(!add.ok && add.code === "read_only");
  const edit = await updateNote(o, id, created.note.id, "Refusée", 1);
  assert.ok(!edit.ok && edit.code === "read_only");
  const del = await deleteNote(o, id, created.note.id);
  assert.ok(!del.ok && del.code === "read_only");

  await admin!.from("sv_supervisions").update({ state: "deleted" }).eq("id", id);
  assert.equal(await listNotes(o, id), null);
  const gone = await addNote(o, id, key("f3"), { body: "Refusée", eventRef: null, eventTitle: null });
  assert.ok(!gone.ok && gone.code === "not_found");
});

test("les notes d'une Supervision ne sont pas lisibles avec les clés publiques de la base (RLS)", { skip }, async () => {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anon) return;
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const read = await client.from("sv_notes").select("id").limit(1);
  assert.ok(read.error || (read.data ?? []).length === 0, "aucune ligne lisible avec la clé publique");
  const call = await client.rpc("sv_add_note", { p_owner: "x", p_supervision_id: "00000000-0000-0000-0000-000000000000", p_key: "xxxxxxxx", p_body: "x", p_event_ref: null, p_event_title: null });
  assert.ok(call.error, "fonction non exécutable avec la clé publique");
});
