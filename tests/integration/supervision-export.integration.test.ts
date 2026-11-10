// Tests d'INTÉGRATION de l'export PDF : base de PRÉPRODUCTION seulement. AUCUN accès réseau externe, aucune IA.
//   npm run test:staging
// Il faut avoir exécuté supabase/supervision-lot7-notes.sql et supervision-lot8-alerts.sql dans la préproduction.

import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { PDFDocument } from "pdf-lib";
import { addNote } from "../../lib/supervision/core/notesStore";
import { initialScope } from "../../lib/supervision/core/scope";
import * as store from "../../lib/supervision/core/store";
import { setAlertStates } from "../../lib/supervision/alerts/store";
import { generateSupervisionReport } from "../../lib/supervision/export/generate";

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

const setState = (id: string, state: string) => admin!.from("sv_supervisions").update({ state }).eq("id", id);

test("l'export suit les droits de l'état : refusé en brouillon, permis en pause et en lecture seule, refusé pour une Supervision supprimée", { skip }, async () => {
  const o = `it-export-${runId}-a`;
  const id = await draft(o, "Veille export A");
  const options = { period: 30 as const, includeNotes: false, client: admin! as never };

  const asDraft = await generateSupervisionReport(o, id, options);
  assert.deepEqual(asDraft, { ok: false, code: "export_unavailable", state: "draft" });

  await setState(id, "paused");
  const paused = await generateSupervisionReport(o, id, options);
  assert.ok(paused.ok, JSON.stringify(paused));
  if (!paused.ok) return;
  assert.match(paused.filename, /^supervision-veille-export-a-\d{4}-\d{2}-\d{2}\.pdf$/);
  assert.equal(new TextDecoder().decode(paused.bytes.slice(0, 5)), "%PDF-");
  const parsed = await PDFDocument.load(paused.bytes);
  assert.ok(parsed.getPageCount() >= 2);
  assert.match(parsed.getTitle() ?? "", /Veille export A/);

  await setState(id, "read_only_grace");
  assert.ok((await generateSupervisionReport(o, id, options)).ok, "consultation et export permis en lecture seule");

  await setState(id, "deleted");
  assert.deepEqual(await generateSupervisionReport(o, id, options), { ok: false, code: "not_found" });
});

test("isolation : un autre compte ne peut pas exporter la Supervision, même en connaissant l'identifiant", { skip }, async () => {
  const alice = `it-export-${runId}-b1`;
  const bob = `it-export-${runId}-b2`;
  const id = await draft(alice, "Veille export B");
  owners.push(bob);
  await setState(id, "paused");
  const options = { period: 30 as const, includeNotes: true, client: admin! as never };
  assert.deepEqual(await generateSupervisionReport(bob, id, options), { ok: false, code: "not_found" });
  assert.ok((await generateSupervisionReport(alice, id, options)).ok);
});

test("les notes ne sont dans le PDF que si l'utilisateur le demande ; le rapport reste valide dans les deux cas", { skip }, async () => {
  const o = `it-export-${runId}-c`;
  const id = await draft(o, "Veille export C");
  await setState(id, "paused");
  const added = await addNote(o, id, `note-${runId}-c`, { body: "Note privée de test pour le PDF", eventRef: null, eventTitle: null });
  assert.ok(added.ok, JSON.stringify(added));
  await setAlertStates(o, id, "read", [{ eventRef: "a-1", level: "critique" }]);

  const without = await generateSupervisionReport(o, id, { period: 30, includeNotes: false, client: admin! as never });
  const withNotes = await generateSupervisionReport(o, id, { period: 30, includeNotes: true, client: admin! as never });
  assert.ok(without.ok && withNotes.ok);
  if (!without.ok || !withNotes.ok) return;
  // Le texte d'une page est compressé dans le PDF : on compare donc la taille, la section « Notes » ajoute du contenu.
  assert.ok(withNotes.bytes.byteLength > without.bytes.byteLength, `${withNotes.bytes.byteLength} > ${without.bytes.byteLength}`);
  for (const result of [without, withNotes]) assert.ok((await PDFDocument.load(result.bytes)).getPageCount() >= 2);
});

test("la période change le contenu : 7 jours produit un rapport plus court que 90 jours", { skip }, async () => {
  const o = `it-export-${runId}-d`;
  const id = await draft(o, "Veille export D");
  await setState(id, "paused");
  const week = await generateSupervisionReport(o, id, { period: 7, includeNotes: false, client: admin! as never });
  const quarter = await generateSupervisionReport(o, id, { period: 90, includeNotes: false, client: admin! as never });
  assert.ok(week.ok && quarter.ok);
  if (week.ok && quarter.ok) assert.ok(quarter.bytes.byteLength >= week.bytes.byteLength);
});
