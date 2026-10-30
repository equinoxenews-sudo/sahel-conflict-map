process.env.EQUINOXE_FAKE_DB = "1";

import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import {
  cloudKey,
  commitCloudUpload,
  deleteCloudDossier,
  dossierIdOfKey,
  getCloudChunk,
  getCloudMeta,
  getCloudVersionChunkCount,
  isValidDossierId,
  listCloudDossiers,
  listCloudVersions,
  putCloudChunk,
} from "../lib/investigationCloud";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import { resetFakeDb } from "../lib/testing/fakeSupabase";

const FOUNDER = null;
const ALICE = "test-alice";
const BRUNO = "test-bruno";

/** Envoie un dossier d'un seul morceau pour ce propriétaire. */
async function upload(owner: string | null, dossierId: string, uploadId: string, text: string, name = "Dossier") {
  await putCloudChunk(owner, dossierId, uploadId, 0, text);
  return commitCloudUpload(owner, { dossierId, uploadId, chunkCount: 1, name, description: "", entityCount: 1, noteCount: 1 });
}

async function readAll(owner: string | null, dossierId: string): Promise<string | null> {
  const found = await getCloudMeta(owner, dossierId);
  return found ? getCloudChunk(owner, dossierId, found.uploadId, 0) : null;
}

beforeEach(() => resetFakeDb());

test("les dossiers du fondateur gardent exactement leur clé d'origine", () => {
  assert.equal(cloudKey(FOUNDER, "abc-123"), "abc-123");
  assert.equal(cloudKey(ALICE, "abc-123"), "test-alice:abc-123");
  assert.equal(dossierIdOfKey(FOUNDER, "abc-123"), "abc-123");
  assert.equal(dossierIdOfKey(ALICE, "test-alice:abc-123"), "abc-123");
});

test("une clé n'appartient jamais qu'à un seul propriétaire", () => {
  assert.equal(dossierIdOfKey(FOUNDER, "test-alice:abc-123"), null);
  assert.equal(dossierIdOfKey(ALICE, "abc-123"), null);
  assert.equal(dossierIdOfKey(BRUNO, "test-alice:abc-123"), null);
  assert.equal(dossierIdOfKey(ALICE, "test-alice:"), null);
});

test("un identifiant de dossier ne peut pas contenir le séparateur : aucune clé forgée", () => {
  assert.equal(isValidDossierId("test-alice:abc"), false);
  assert.throws(() => cloudKey(ALICE, "test-bruno:abc"));
  assert.throws(() => cloudKey(FOUNDER, "test-alice:abc"));
  assert.throws(() => cloudKey("Alice:evil", "abc"));
  assert.throws(() => cloudKey("", "abc"));
});

test("un compte ne liste que ses dossiers ; le fondateur ne voit que les siens", async () => {
  await upload(FOUNDER, "apn-1", "up-founder-1", "APN", "Enquête APN");
  await upload(ALICE, "doc-a", "up-alice-001", "alice", "Dossier d'Alice");
  await upload(BRUNO, "doc-b", "up-bruno-001", "bruno", "Dossier de Bruno");

  assert.deepEqual((await listCloudDossiers(FOUNDER)).map((d) => d.id), ["apn-1"]);
  assert.deepEqual((await listCloudDossiers(ALICE)).map((d) => d.id), ["doc-a"]);
  assert.deepEqual((await listCloudDossiers(BRUNO)).map((d) => d.id), ["doc-b"]);
  assert.deepEqual(await listCloudDossiers("test-carole"), []);
});

test("un compte ne lit jamais le dossier d'un autre, même avec son identifiant exact", async () => {
  await upload(FOUNDER, "apn-1", "up-founder-1", "contenu secret de l'enquête APN", "Enquête APN");
  await upload(ALICE, "doc-a", "up-alice-001", "contenu d'Alice");

  assert.equal(await getCloudMeta(BRUNO, "apn-1"), null);
  assert.equal(await getCloudMeta(BRUNO, "doc-a"), null);
  assert.equal(await getCloudMeta(ALICE, "apn-1"), null);
  assert.equal(await getCloudMeta(FOUNDER, "doc-a"), null);
  assert.equal(await getCloudChunk(BRUNO, "doc-a", "up-alice-001", 0), null);
  assert.equal(await getCloudChunk(ALICE, "apn-1", "up-founder-1", 0), null);
  assert.equal(await getCloudVersionChunkCount(BRUNO, "doc-a", "up-alice-001"), 0);
  assert.deepEqual(await listCloudVersions(BRUNO, "doc-a"), []);
  assert.equal(await readAll(ALICE, "doc-a"), "contenu d'Alice");
  assert.equal(await readAll(FOUNDER, "apn-1"), "contenu secret de l'enquête APN");
});

test("deux comptes qui utilisent le même identifiant de dossier ne s'écrasent pas", async () => {
  await upload(FOUNDER, "meme-id", "up-founder-1", "version du fondateur");
  await upload(ALICE, "meme-id", "up-alice-001", "version d'Alice");
  await upload(BRUNO, "meme-id", "up-bruno-001", "version de Bruno");

  assert.equal(await readAll(FOUNDER, "meme-id"), "version du fondateur");
  assert.equal(await readAll(ALICE, "meme-id"), "version d'Alice");
  assert.equal(await readAll(BRUNO, "meme-id"), "version de Bruno");

  // Une nouvelle version d'Alice remplace la sienne, pas celles des autres.
  await upload(ALICE, "meme-id", "up-alice-002", "Alice, version 2");
  assert.equal(await readAll(ALICE, "meme-id"), "Alice, version 2");
  assert.equal(await readAll(FOUNDER, "meme-id"), "version du fondateur");
  assert.equal(await readAll(BRUNO, "meme-id"), "version de Bruno");
});

test("un compte ne supprime jamais le dossier d'un autre", async () => {
  await upload(FOUNDER, "apn-1", "up-founder-1", "APN");
  await upload(ALICE, "doc-a", "up-alice-001", "alice");

  await deleteCloudDossier(BRUNO, "apn-1");
  await deleteCloudDossier(BRUNO, "doc-a");
  await deleteCloudDossier(ALICE, "apn-1");
  await deleteCloudDossier(FOUNDER, "doc-a");

  assert.equal(await readAll(FOUNDER, "apn-1"), "APN");
  assert.equal(await readAll(ALICE, "doc-a"), "alice");

  await deleteCloudDossier(ALICE, "doc-a");
  assert.equal(await readAll(ALICE, "doc-a"), null);
  assert.equal(await readAll(FOUNDER, "apn-1"), "APN");
});

test("valider un envoi avec l'identifiant d'envoi d'un autre compte échoue sans rien remplacer", async () => {
  await upload(ALICE, "doc-a", "up-alice-001", "alice");
  // Bruno connaît le dossier et l'envoi d'Alice : il ne peut ni valider ni lire.
  await assert.rejects(
    commitCloudUpload(BRUNO, { dossierId: "doc-a", uploadId: "up-alice-001", chunkCount: 1, name: "vol", description: "", entityCount: 0, noteCount: 0 }),
    /manquant/,
  );
  assert.equal(await getCloudMeta(BRUNO, "doc-a"), null);
  assert.equal(await readAll(ALICE, "doc-a"), "alice");
});

test("l'historique des versions est propre à chaque compte", async () => {
  await upload(ALICE, "doc-a", "up-alice-001", "v1");
  await upload(ALICE, "doc-a", "up-alice-002", "v2");
  await upload(BRUNO, "doc-a", "up-bruno-001", "autre");
  assert.deepEqual((await listCloudVersions(ALICE, "doc-a")).map((v) => v.uploadId).sort(), ["up-alice-001", "up-alice-002"]);
  assert.deepEqual((await listCloudVersions(BRUNO, "doc-a")).map((v) => v.uploadId), ["up-bruno-001"]);
  assert.deepEqual(await listCloudVersions(FOUNDER, "doc-a"), []);
});

test("le caractère _ d'un identifiant n'est pas un joker : « a_b » ne voit pas « axb »", async () => {
  await upload("a_b", "doc-1", "up-ab-00001", "a_b");
  await upload("axb", "doc-1", "up-axb-0001", "axb");
  assert.deepEqual((await listCloudVersions("a_b", "doc-1")).map((v) => v.uploadId), ["up-ab-00001"]);
  assert.deepEqual((await listCloudDossiers("a_b")).map((d) => d.name), ["Dossier"]);
  assert.equal((await listCloudDossiers("a_b")).length, 1);
  assert.equal((await listCloudDossiers("axb")).length, 1);
  assert.equal(await readAll("a_b", "doc-1"), "a_b");
  assert.equal(await readAll("axb", "doc-1"), "axb");
});

test("les lignes déjà en base du fondateur (sans préfixe) restent lisibles et intactes après l'activité des autres comptes", async () => {
  // Données telles qu'elles existent aujourd'hui en production : clé nue, aucune colonne de propriétaire.
  const db = getSupabaseAdmin();
  await db.from("investigation_cloud_chunks").upsert({ dossier_id: "apn-ancien", upload_id: "up-ancien-01", seq: 0, data: "ancien contenu APN", created_at: "2026-10-20T10:00:00Z" });
  await db.from("investigation_cloud").upsert({
    dossier_id: "apn-ancien",
    name: "Enquête APN",
    description: "",
    upload_id: "up-ancien-01",
    chunk_count: 1,
    bytes: 18,
    entity_count: 5,
    note_count: 7,
    uploaded_at: "2026-10-20T10:00:00Z",
  });
  const before = JSON.stringify((await db.from("investigation_cloud").select("*")).data);
  const chunksBefore = JSON.stringify((await db.from("investigation_cloud_chunks").select("*")).data);

  await upload(ALICE, "apn-ancien", "up-alice-001", "alice, même identifiant");
  await deleteCloudDossier(BRUNO, "apn-ancien");
  await listCloudDossiers(ALICE);

  const list = await listCloudDossiers(FOUNDER);
  assert.deepEqual(list.map((d) => [d.id, d.name, d.entityCount, d.noteCount]), [["apn-ancien", "Enquête APN", 5, 7]]);
  assert.equal(await readAll(FOUNDER, "apn-ancien"), "ancien contenu APN");

  const fakeRows = (await db.from("investigation_cloud").select("*").eq("dossier_id", "apn-ancien")).data;
  assert.equal(JSON.stringify(fakeRows), JSON.stringify(JSON.parse(before)));
  const chunkRows = (await db.from("investigation_cloud_chunks").select("*").eq("dossier_id", "apn-ancien")).data;
  assert.equal(JSON.stringify(chunkRows), JSON.stringify(JSON.parse(chunksBefore)));
});
