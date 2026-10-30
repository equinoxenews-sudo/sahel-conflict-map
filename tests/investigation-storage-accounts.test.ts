import assert from "node:assert/strict";
import test from "node:test";

// Un localStorage factice, partagé comme le serait celui d'un même navigateur utilisé par plusieurs comptes.
const memory = new Map<string, string>();
const localStorage = {
  getItem: (key: string) => (memory.has(key) ? (memory.get(key) as string) : null),
  setItem: (key: string, value: string) => void memory.set(key, value),
  removeItem: (key: string) => void memory.delete(key),
};
Object.assign(globalThis, {
  window: { localStorage, addEventListener() {}, removeEventListener() {} },
  document: { addEventListener() {}, visibilityState: "visible" },
});

import { setStorageScope } from "../lib/investigation/scope";
import { readSyncBases, saveSyncBase } from "../lib/investigation/autoSave";
import { createLocalStorageEngine } from "../lib/investigation/storage";

const LEGACY_KEY = "equinoxe-investigation-v1";

function openEngine(scope: string) {
  setStorageScope(scope);
  return createLocalStorageEngine();
}

test("le fondateur retrouve ses dossiers dans la clé d'origine, sans migration", () => {
  // Données telles qu'elles sont déjà dans le navigateur de Nicolas avant la mise en place des comptes.
  const existing = {
    version: 1,
    dossiers: [{ id: "apn", name: "Enquête APN", description: "", createdAt: "2026-10-20T09:00:00Z", updatedAt: "2026-10-20T09:00:00Z" }],
    sources: [],
    entities: [],
    relations: [],
    notes: [],
    canvasCards: [],
    canvasLinks: [],
    shapes: [],
  };
  memory.set(LEGACY_KEY, JSON.stringify(existing));
  const founder = openEngine("");
  assert.deepEqual(founder.load().dossiers.map((d) => d.name), ["Enquête APN"]);
});

test("un compte individuel sur le même navigateur ne voit pas les dossiers du fondateur", () => {
  const alice = openEngine("test-alice");
  assert.deepEqual(alice.load().dossiers, []);
});

test("les dossiers créés par un compte restent dans son espace, avant comme après rechargement", () => {
  const alice = openEngine("test-alice");
  alice.createDossier("Dossier d'Alice", "privé");
  assert.deepEqual(alice.load().dossiers.map((d) => d.name), ["Dossier d'Alice"]);

  // « Rechargement » : un nouveau moteur pour le même compte relit le navigateur.
  assert.deepEqual(openEngine("test-alice").load().dossiers.map((d) => d.name), ["Dossier d'Alice"]);
  // Un autre compte du même navigateur ne le voit pas.
  assert.deepEqual(openEngine("test-bruno").load().dossiers, []);
  // Le fondateur non plus, et son dossier est intact.
  assert.deepEqual(openEngine("").load().dossiers.map((d) => d.name), ["Enquête APN"]);
});

test("une modification faite par un compte ne touche jamais la clé d'un autre", () => {
  const before = memory.get(LEGACY_KEY);
  const bruno = openEngine("test-bruno");
  const dossier = bruno.createDossier("Dossier de Bruno", "");
  bruno.addNote({ dossierId: dossier.id, title: "Note", body: "contenu", tags: [] } as unknown as Parameters<typeof bruno.addNote>[0]);
  bruno.deleteDossier(dossier.id);
  assert.equal(memory.get(LEGACY_KEY), before);
  assert.ok(memory.has("equinoxe-investigation-v1:test-bruno"));
  assert.ok(memory.has("equinoxe-investigation-v1:test-alice"));
});

test("le fondateur peut modifier ses dossiers sans toucher à ceux des comptes", () => {
  const aliceBefore = memory.get("equinoxe-investigation-v1:test-alice");
  const founder = openEngine("");
  founder.createDossier("Autre dossier du fondateur", "");
  assert.equal(memory.get("equinoxe-investigation-v1:test-alice"), aliceBefore);
  assert.equal(openEngine("test-alice").load().dossiers.length, 1);
});

test("les repères de synchronisation en ligne sont propres à chaque compte", () => {
  setStorageScope("test-alice");
  saveSyncBase("d1", { signature: "sig-alice", remoteUploadedAt: "2026-10-30T10:00:00Z" });
  setStorageScope("test-bruno");
  assert.deepEqual(readSyncBases(), {});
  setStorageScope("");
  assert.deepEqual(readSyncBases(), {});
  setStorageScope("test-alice");
  assert.equal(readSyncBases().d1?.signature, "sig-alice");
});

test("« Faire une copie » : un dossier indépendant « Nom (copie) », avec son contenu, sans toucher à l'original", async () => {
  const { duplicateDossier } = await import("../lib/investigation/duplicate");
  const alice = openEngine("test-alice");
  const original = alice.createDossier("APN GRAPH", "description");
  alice.addEntity({ dossierId: original.id, name: "Fiche 1", type: "person" } as unknown as Parameters<typeof alice.addEntity>[0]);
  alice.addEntity({ dossierId: original.id, name: "Fiche 2", type: "organization" } as unknown as Parameters<typeof alice.addEntity>[0]);

  const copyId = await duplicateDossier(alice, original.id);
  const data = alice.load();
  const copy = data.dossiers.find((d) => d.id === copyId);
  assert.equal(copy?.name, "APN GRAPH (copie)");
  assert.notEqual(copyId, original.id);
  assert.equal(data.dossiers.find((d) => d.id === original.id)?.name, "APN GRAPH");
  const entitiesOf = (id: string) => data.entities.filter((e) => e.dossierId === id);
  assert.deepEqual(entitiesOf(copyId).map((e) => e.name).sort(), ["Fiche 1", "Fiche 2"]);
  assert.equal(entitiesOf(original.id).length, 2);
  assert.ok(entitiesOf(copyId).every((e) => !entitiesOf(original.id).some((o) => o.id === e.id)), "identifiants distincts");

  // Travailler dans la copie ne change pas l'original.
  alice.addEntity({ dossierId: copyId, name: "Ajout dans la copie", type: "person" } as unknown as Parameters<typeof alice.addEntity>[0]);
  assert.equal(alice.load().entities.filter((e) => e.dossierId === original.id).length, 2);
});

test("l'import d'un fichier garde son suffixe « (importé) » par défaut", async () => {
  const alice = openEngine("test-alice");
  const source = alice.createDossier("Rapport", "");
  const json = await alice.exportDossier(source.id);
  const id = await alice.importDossier(json);
  assert.equal(alice.load().dossiers.find((d) => d.id === id)?.name, "Rapport (importé)");
});
