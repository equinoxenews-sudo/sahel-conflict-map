// Copie en ligne des dossiers d'investigation (serveur uniquement, clé de service).
// Voir supabase/add-investigation-cloud.sql. L'accès est vérifié par les routes API (compte connecté) ; ce module
// garantit le CLOISONNEMENT : chaque fonction reçoit le propriétaire (déduit de la session par la route, jamais de la
// requête) et construit elle-même la clé stockée en base. Un compte ne peut donc ni lire, ni lister, ni écraser, ni
// supprimer le dossier d'un autre, même en envoyant exactement le même identifiant de dossier.
import { selectVersionsToKeep } from "./investigationVersions";
import { getSupabaseAdmin } from "./supabaseAdmin";

/** Propriétaire d'un dossier : null pour le compte du fondateur, sinon l'identifiant normalisé du compte individuel. */
export type CloudOwner = string | null;

export interface CloudDossierMeta {
  id: string;
  name: string;
  description: string;
  chunkCount: number;
  bytes: number;
  entityCount: number;
  noteCount: number;
  uploadedAt: string;
}

interface MetaRow {
  dossier_id: string;
  name: string;
  description: string;
  upload_id: string;
  chunk_count: number;
  bytes: number;
  entity_count: number;
  note_count: number;
  uploaded_at: string;
}

/** Taille maximale d'un morceau reçu (caractères) : au-dessus, la requête est refusée. */
export const MAX_CHUNK_CHARS = 2_500_000;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
/** Identifiants de compte individuel (lib/accounts.ts : minuscules, chiffres, point, tiret, souligné). */
const OWNER_PATTERN = /^[a-z0-9._-]{3,40}$/;
/** Sépare le propriétaire du dossier dans la clé. Absent de ID_PATTERN et de OWNER_PATTERN : la clé se décompose sans ambiguïté. */
const SEPARATOR = ":";

export function isValidDossierId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

/**
 * Clé stockée en base (colonne dossier_id des deux tables). Fondateur : l'identifiant tel quel, comme avant la mise en
 * place des comptes (ses dossiers existants ne sont ni migrés ni renommés). Compte individuel : « compte:dossier ».
 */
export function cloudKey(owner: CloudOwner, dossierId: string): string {
  if (!isValidDossierId(dossierId)) throw new Error("Identifiant de dossier invalide.");
  if (owner === null) return dossierId;
  if (!OWNER_PATTERN.test(owner)) throw new Error("Propriétaire invalide.");
  return `${owner}${SEPARATOR}${dossierId}`;
}

/** L'identifiant du dossier (sans propriétaire) si cette clé appartient bien à ce propriétaire, sinon null. */
export function dossierIdOfKey(owner: CloudOwner, key: string): string | null {
  if (owner === null) return ID_PATTERN.test(key) ? key : null;
  if (!OWNER_PATTERN.test(owner) || !key.startsWith(`${owner}${SEPARATOR}`)) return null;
  const id = key.slice(owner.length + SEPARATOR.length);
  return ID_PATTERN.test(id) ? id : null;
}

/** Échappe % _ \ pour un motif LIKE : « a_b » ne doit pas couvrir « axb ». */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

const toMeta = (owner: CloudOwner, row: MetaRow): CloudDossierMeta => {
  const id = dossierIdOfKey(owner, row.dossier_id);
  if (id === null) throw new Error("Dossier en ligne d'un autre compte : refusé.");
  return {
    id,
    name: row.name,
    description: row.description,
    chunkCount: row.chunk_count,
    bytes: row.bytes,
    entityCount: row.entity_count,
    noteCount: row.note_count,
    uploadedAt: row.uploaded_at,
  };
};

export async function listCloudDossiers(owner: CloudOwner): Promise<CloudDossierMeta[]> {
  const query = getSupabaseAdmin().from("investigation_cloud").select("*");
  const { data, error } = await (owner === null
    ? query.not("dossier_id", "like", `%${SEPARATOR}%`)
    : query.like("dossier_id", `${escapeLike(owner)}${SEPARATOR}%`)
  ).order("uploaded_at", { ascending: false });
  if (error) throw new Error(error.message);
  // Seconde barrière : même si le filtre de la base laissait passer une ligne, elle n'est jamais renvoyée à un autre compte.
  return ((data ?? []) as MetaRow[]).filter((row) => dossierIdOfKey(owner, row.dossier_id) !== null).map((row) => toMeta(owner, row));
}

export async function getCloudMeta(owner: CloudOwner, dossierId: string): Promise<{ meta: CloudDossierMeta; uploadId: string } | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("investigation_cloud")
    .select("*")
    .eq("dossier_id", cloudKey(owner, dossierId))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as MetaRow;
  return { meta: toMeta(owner, row), uploadId: row.upload_id };
}

export async function getCloudChunk(owner: CloudOwner, dossierId: string, uploadId: string, seq: number): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("investigation_cloud_chunks")
    .select("data")
    .eq("dossier_id", cloudKey(owner, dossierId))
    .eq("upload_id", uploadId)
    .eq("seq", seq)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { data: string } | null)?.data ?? null;
}

export async function putCloudChunk(owner: CloudOwner, dossierId: string, uploadId: string, seq: number, data: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("investigation_cloud_chunks")
    .upsert({ dossier_id: cloudKey(owner, dossierId), upload_id: uploadId, seq, data });
  if (error) throw new Error(error.message);
}

export interface CommitInput {
  dossierId: string;
  uploadId: string;
  chunkCount: number;
  name: string;
  description: string;
  entityCount: number;
  noteCount: number;
}

/** Valide un envoi : vérifie que tous les morceaux sont là, bascule la version courante, puis
 * supprime les anciennes versions. */
export async function commitCloudUpload(owner: CloudOwner, input: CommitInput): Promise<CloudDossierMeta> {
  const admin = getSupabaseAdmin();
  const key = cloudKey(owner, input.dossierId);
  const { data, error } = await admin
    .from("investigation_cloud_chunks")
    .select("seq, data")
    .eq("dossier_id", key)
    .eq("upload_id", input.uploadId);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { seq: number; data: string }[];
  const seqs = new Set(rows.map((row) => row.seq));
  for (let i = 0; i < input.chunkCount; i++) {
    if (!seqs.has(i)) throw new Error(`Morceau ${i + 1}/${input.chunkCount} manquant : envoi incomplet, rien n'a été remplacé.`);
  }
  const bytes = rows.reduce((sum, row) => sum + row.data.length, 0);

  const { data: saved, error: upsertError } = await admin
    .from("investigation_cloud")
    .upsert({
      dossier_id: key,
      name: input.name.slice(0, 200),
      description: input.description.slice(0, 1000),
      upload_id: input.uploadId,
      chunk_count: input.chunkCount,
      bytes,
      entity_count: input.entityCount,
      note_count: input.noteCount,
      uploaded_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (upsertError) throw new Error(upsertError.message);

  // Nettoyage : on garde la version validée et un historique éclairci (les plus récentes + la dernière de
  // chaque jour récent, voir investigationVersions.ts) ; le reste et les envois abandonnés sont retirés.
  const versions = await listCloudVersions(owner, input.dossierId);
  const keep = selectVersionsToKeep(
    versions.map((row) => ({ upload_id: row.uploadId, created_at: row.createdAt })),
    input.uploadId,
  );
  const drop = versions.map((row) => row.uploadId).filter((id) => !keep.has(id));
  if (drop.length > 0) {
    await admin.from("investigation_cloud_chunks").delete().eq("dossier_id", key).in("upload_id", drop);
  }
  return toMeta(owner, saved as MetaRow);
}

export async function deleteCloudDossier(owner: CloudOwner, dossierId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const key = cloudKey(owner, dossierId);
  const { error: chunkError } = await admin.from("investigation_cloud_chunks").delete().eq("dossier_id", key);
  if (chunkError) throw new Error(chunkError.message);
  const { error } = await admin.from("investigation_cloud").delete().eq("dossier_id", key);
  if (error) throw new Error(error.message);
}

export interface CloudVersion {
  uploadId: string;
  createdAt: string;
  chunkCount: number;
  current: boolean;
}

/** Les versions complètes d'un dossier (une ligne par envoi), de la plus récente à la plus ancienne. */
export async function listCloudVersions(owner: CloudOwner, dossierId: string): Promise<{ uploadId: string; createdAt: string }[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("investigation_cloud_chunks")
    .select("upload_id, created_at")
    .eq("dossier_id", cloudKey(owner, dossierId))
    .eq("seq", 0);
  if (error) throw new Error(error.message);
  return ((data ?? []) as { upload_id: string; created_at: string }[])
    .map((row) => ({ uploadId: row.upload_id, createdAt: row.created_at }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getCloudVersionChunkCount(owner: CloudOwner, dossierId: string, uploadId: string): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from("investigation_cloud_chunks")
    .select("seq", { count: "exact", head: true })
    .eq("dossier_id", cloudKey(owner, dossierId))
    .eq("upload_id", uploadId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}
