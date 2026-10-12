// Copie en ligne des dossiers d'investigation (serveur uniquement, clé de service).
// Voir supabase/add-investigation-cloud.sql. L'accès est vérifié par les routes API
// (cookie d'administration) : ce module ne fait aucun contrôle d'accès lui-même.
import { getSupabaseAdmin } from "./supabaseAdmin";

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

const toMeta = (row: MetaRow): CloudDossierMeta => ({
  id: row.dossier_id,
  name: row.name,
  description: row.description,
  chunkCount: row.chunk_count,
  bytes: row.bytes,
  entityCount: row.entity_count,
  noteCount: row.note_count,
  uploadedAt: row.uploaded_at,
});

/** Taille maximale d'un morceau reçu (caractères) : au-dessus, la requête est refusée. */
export const MAX_CHUNK_CHARS = 2_500_000;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;

export function isValidDossierId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

export async function listCloudDossiers(): Promise<CloudDossierMeta[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("investigation_cloud")
    .select("*")
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as MetaRow[]).map(toMeta);
}

export async function getCloudMeta(dossierId: string): Promise<{ meta: CloudDossierMeta; uploadId: string } | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("investigation_cloud")
    .select("*")
    .eq("dossier_id", dossierId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as MetaRow;
  return { meta: toMeta(row), uploadId: row.upload_id };
}

export async function getCloudChunk(dossierId: string, uploadId: string, seq: number): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("investigation_cloud_chunks")
    .select("data")
    .eq("dossier_id", dossierId)
    .eq("upload_id", uploadId)
    .eq("seq", seq)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { data: string } | null)?.data ?? null;
}

export async function putCloudChunk(dossierId: string, uploadId: string, seq: number, data: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("investigation_cloud_chunks")
    .upsert({ dossier_id: dossierId, upload_id: uploadId, seq, data });
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
export async function commitCloudUpload(input: CommitInput): Promise<CloudDossierMeta> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("investigation_cloud_chunks")
    .select("seq, data")
    .eq("dossier_id", input.dossierId)
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
      dossier_id: input.dossierId,
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

  // Nettoyage : on garde la version qui vient d'être validée ET la précédente (filet de sécurité
  // contre un envoi par erreur) ; les versions plus anciennes et les envois abandonnés sont retirés.
  const { data: versions } = await admin
    .from("investigation_cloud_chunks")
    .select("upload_id, created_at")
    .eq("dossier_id", input.dossierId)
    .eq("seq", 0);
  const ranked = ((versions ?? []) as { upload_id: string; created_at: string }[])
    .filter((row) => row.upload_id !== input.uploadId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const keepPrevious = ranked[0]?.upload_id;
  let cleanup = admin
    .from("investigation_cloud_chunks")
    .delete()
    .eq("dossier_id", input.dossierId)
    .neq("upload_id", input.uploadId);
  if (keepPrevious) cleanup = cleanup.neq("upload_id", keepPrevious);
  await cleanup;
  return toMeta(saved as MetaRow);
}

export async function deleteCloudDossier(dossierId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error: chunkError } = await admin.from("investigation_cloud_chunks").delete().eq("dossier_id", dossierId);
  if (chunkError) throw new Error(chunkError.message);
  const { error } = await admin.from("investigation_cloud").delete().eq("dossier_id", dossierId);
  if (error) throw new Error(error.message);
}
