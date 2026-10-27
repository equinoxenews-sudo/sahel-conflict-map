import assert from "node:assert/strict";
import test from "node:test";
import { decideAutoSave, dossierContentCount, dossierSignature, type SyncBase } from "../lib/investigation/autoSave";
import { selectVersionsToKeep } from "../lib/investigationVersions";
import { emptyInvestigationData, type InvestigationData } from "../lib/investigation/types";

const REMOTE = { uploadedAt: "2026-10-20T10:00:00.000Z", entityCount: 5, noteCount: 3 };
const BASE: SyncBase = { signature: "sig-a", remoteUploadedAt: REMOTE.uploadedAt };

function dataWith(overrides: Partial<InvestigationData>): InvestigationData {
  return { ...emptyInvestigationData(), ...overrides };
}

test("rien à envoyer quand le contenu n'a pas bougé depuis la dernière synchronisation", () => {
  assert.equal(decideAutoSave({ signature: "sig-a", contentCount: 8, base: BASE, remote: REMOTE }), "skip");
});

test("un changement local sur une copie en ligne que cet appareil connaît s'envoie", () => {
  assert.equal(decideAutoSave({ signature: "sig-b", contentCount: 9, base: BASE, remote: REMOTE }), "push");
});

test("une copie en ligne plus récente que celle dont on est parti n'est jamais écrasée", () => {
  const moved = { ...REMOTE, uploadedAt: "2026-10-20T12:30:00.000Z" };
  assert.equal(decideAutoSave({ signature: "sig-b", contentCount: 9, base: BASE, remote: moved }), "conflict");
});

test("un appareil qui n'a rien changé depuis la dernière synchronisation récupère la copie en ligne plus récente", () => {
  const moved = { ...REMOTE, uploadedAt: "2026-10-20T12:30:00.000Z" };
  assert.equal(decideAutoSave({ signature: "sig-a", contentCount: 9, base: BASE, remote: moved }), "pull");
});

test("une copie en ligne jamais vue par cet appareil demande avant tout envoi", () => {
  assert.equal(decideAutoSave({ signature: "sig-b", contentCount: 9, base: undefined, remote: REMOTE }), "conflict");
});

test("un dossier absent en ligne est envoyé", () => {
  assert.equal(decideAutoSave({ signature: "sig-b", contentCount: 2, base: undefined, remote: undefined }), "push");
});

test("un dossier déjà synchronisé puis supprimé en ligne n'est pas remis en ligne", () => {
  assert.equal(decideAutoSave({ signature: "sig-b", contentCount: 4, base: BASE, remote: undefined }), "skip");
});

test("un dossier vide ici ne remplace jamais une copie en ligne pleine", () => {
  assert.equal(decideAutoSave({ signature: "sig-empty", contentCount: 0, base: BASE, remote: REMOTE }), "protect");
  assert.equal(decideAutoSave({ signature: "sig-empty", contentCount: 0, base: undefined, remote: REMOTE }), "protect");
});

test("un dossier vide envoyé pour la première fois est accepté", () => {
  assert.equal(decideAutoSave({ signature: "sig-empty", contentCount: 0, base: undefined, remote: undefined }), "push");
});

test("l'empreinte change avec le contenu du dossier, pas avec celui d'un autre", () => {
  const dossier = { id: "d1", name: "A", description: "", createdAt: "x", updatedAt: "x" };
  const other = { id: "d2", name: "B", description: "", createdAt: "x", updatedAt: "x" };
  const entity = (id: string, dossierId: string) => ({ id, dossierId, type: "person", name: id, aliases: [], notes: "", position: { x: 0, y: 0 } }) as unknown as InvestigationData["entities"][number];
  const before = dataWith({ dossiers: [dossier, other], entities: [entity("e1", "d1")] });
  const sameDossier = dataWith({ dossiers: [dossier, other], entities: [entity("e1", "d1")] });
  const touchedOther = dataWith({ dossiers: [dossier, other], entities: [entity("e1", "d1"), entity("e2", "d2")] });
  const touched = dataWith({ dossiers: [dossier, other], entities: [entity("e1", "d1"), entity("e3", "d1")] });
  assert.equal(dossierSignature(before, "d1"), dossierSignature(sameDossier, "d1"));
  assert.equal(dossierSignature(before, "d1"), dossierSignature(touchedOther, "d1"));
  assert.notEqual(dossierSignature(before, "d1"), dossierSignature(touched, "d1"));
  assert.equal(dossierContentCount(touched, "d1"), 2);
  assert.equal(dossierContentCount(touched, "d2"), 0);
});

const version = (id: string, iso: string) => ({ upload_id: id, created_at: iso });

test("l'historique garde la version courante, les plus récentes et la dernière de chaque jour", () => {
  const now = new Date("2026-10-20T18:00:00.000Z");
  const rows = [
    version("cur", "2026-10-20T17:00:00.000Z"),
    version("r1", "2026-10-20T16:00:00.000Z"),
    version("r2", "2026-10-20T15:00:00.000Z"),
    version("r3", "2026-10-20T14:00:00.000Z"),
    version("r4", "2026-10-20T13:00:00.000Z"),
    version("r5", "2026-10-20T12:00:00.000Z"),
    version("r6", "2026-10-20T11:00:00.000Z"),
    version("yesterday-late", "2026-10-19T22:00:00.000Z"),
    version("yesterday-early", "2026-10-19T08:00:00.000Z"),
    version("old", "2026-09-01T08:00:00.000Z"),
  ];
  const keep = selectVersionsToKeep(rows, "cur", now);
  for (const id of ["cur", "r1", "r2", "r3", "r4"]) assert.ok(keep.has(id), id);
  assert.ok(keep.has("yesterday-late"));
  assert.ok(!keep.has("r5"));
  assert.ok(!keep.has("r6"));
  assert.ok(!keep.has("yesterday-early"));
  assert.ok(!keep.has("old"));
});

test("l'historique est plafonné mais garde toujours la version courante", () => {
  const now = new Date("2026-10-20T18:00:00.000Z");
  const rows = [version("cur", "2026-10-20T17:00:00.000Z")];
  for (let day = 1; day <= 14; day++) rows.push(version(`d${day}`, `2026-10-${String(20 - day).padStart(2, "0")}T09:00:00.000Z`));
  const keep = selectVersionsToKeep(rows, "cur", now);
  assert.ok(keep.size <= 12);
  assert.ok(keep.has("cur"));
  assert.ok(keep.has("d1"));
});
