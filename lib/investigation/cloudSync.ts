// Copie en ligne des dossiers d'investigation (solution temporaire, voir
// supabase/add-investigation-cloud.sql). Les dossiers restent dans le navigateur ;
// « envoyer » en dépose une copie sur le serveur (protégée par le mot de passe), « récupérer »
// la rapatrie sur un autre appareil. Un dossier est découpé en morceaux : la limite d'une requête
// sur l'hébergeur est de 4,5 Mo, et les images (en data URL) pèsent vite plusieurs Mo.
import { dossierContentCount, dossierSignature, saveSyncBase } from "./autoSave";
import { saveBackup, type BackupMeta } from "./backups";
import type { InvestigationStorage } from "./storage";

export interface CloudDossier {
  id: string;
  name: string;
  description: string;
  chunkCount: number;
  bytes: number;
  entityCount: number;
  noteCount: number;
  uploadedAt: string;
}

export type CloudErrorCode = "locked" | "not_configured" | "no_tables" | "error";

export class CloudError extends Error {
  constructor(
    message: string,
    readonly code: CloudErrorCode,
  ) {
    super(message);
  }
}

/** Taille d'un morceau envoyé (caractères). */
export const CHUNK_CHARS = 1_500_000;

/** Découpe un texte en morceaux d'au plus `size` caractères (au moins un, même vide). */
export function splitIntoChunks(text: string, size: number = CHUNK_CHARS): string[] {
  if (text.length <= size) return [text];
  const chunks: string[] = [];
  for (let start = 0; start < text.length; start += size) chunks.push(text.slice(start, start + size));
  return chunks;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
  } catch {
    throw new CloudError("Connexion impossible : vérifie ta connexion Internet.", "error");
  }
  const body = (await response.json().catch(() => ({}))) as { error?: string; code?: CloudErrorCode } & T;
  if (!response.ok) {
    const code: CloudErrorCode =
      response.status === 401 ? "locked" : body.code === "not_configured" || body.code === "no_tables" ? body.code : "error";
    throw new CloudError(body.error ?? `Erreur ${response.status}`, code);
  }
  return body;
}

export async function unlockCloud(password: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
  } catch {
    throw new CloudError("Connexion impossible : vérifie ta connexion Internet.", "error");
  }
  if (response.ok) return;
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  throw new CloudError(body.error ?? "Mot de passe incorrect.", response.status === 503 ? "not_configured" : "locked");
}

export async function listCloud(): Promise<CloudDossier[]> {
  const { dossiers } = await call<{ dossiers: CloudDossier[] }>("/api/investigation/cloud");
  return dossiers;
}

export async function deleteCloud(dossierId: string): Promise<void> {
  await call(`/api/investigation/cloud/${encodeURIComponent(dossierId)}`, { method: "DELETE" });
}

/** Envoie la copie complète d'un dossier (images comprises). `onProgress` reçoit (morceau, total). */
export async function pushDossier(
  storage: InvestigationStorage,
  dossierId: string,
  onProgress?: (done: number, total: number) => void,
): Promise<CloudDossier> {
  const data = storage.load();
  const dossier = data.dossiers.find((d) => d.id === dossierId);
  if (!dossier) throw new CloudError("Dossier introuvable sur cet appareil.", "error");

  const signature = dossierSignature(data, dossierId);
  const json = await storage.exportDossier(dossierId);
  const chunks = splitIntoChunks(json);
  const uploadId = crypto.randomUUID().replace(/-/g, "");
  const base = `/api/investigation/cloud/${encodeURIComponent(dossierId)}`;

  for (let seq = 0; seq < chunks.length; seq++) {
    onProgress?.(seq, chunks.length);
    await call(base, { method: "PUT", body: JSON.stringify({ action: "chunk", uploadId, seq, data: chunks[seq] }) });
  }
  onProgress?.(chunks.length, chunks.length);
  const { meta } = await call<{ meta: CloudDossier }>(base, {
    method: "PUT",
    body: JSON.stringify({
      action: "commit",
      uploadId,
      chunkCount: chunks.length,
      name: dossier.name,
      description: dossier.description,
      entityCount: data.entities.filter((e) => e.dossierId === dossierId).length,
      noteCount: data.notes.filter((n) => n.dossierId === dossierId).length,
    }),
  });
  saveSyncBase(dossierId, { signature, remoteUploadedAt: meta.uploadedAt });
  return meta;
}

export interface CloudVersion {
  uploadId: string;
  createdAt: string;
  current: boolean;
}

export async function listCloudVersions(dossierId: string): Promise<CloudVersion[]> {
  const { versions } = await call<{ versions: CloudVersion[] }>(`/api/investigation/cloud/${encodeURIComponent(dossierId)}?versions=1`);
  return versions;
}

/**
 * Rapatrie un dossier en ligne : il remplace la version de cet appareil portant le même identifiant.
 * Sans `uploadId`, c'est la version courante ; avec, une version plus ancienne de l'historique.
 */
export async function pullDossier(
  storage: InvestigationStorage,
  dossierId: string,
  onProgress?: (done: number, total: number) => void,
  uploadId?: string,
): Promise<void> {
  const base = `/api/investigation/cloud/${encodeURIComponent(dossierId)}`;
  const { meta } = await call<{ meta: CloudDossier }>(uploadId ? `${base}?upload=${encodeURIComponent(uploadId)}` : base);
  const parts: string[] = [];
  for (let seq = 0; seq < meta.chunkCount; seq++) {
    onProgress?.(seq, meta.chunkCount);
    const chunk = await call<{ data: string }>(`${base}?${uploadId ? `upload=${encodeURIComponent(uploadId)}&` : ""}seq=${seq}`);
    parts.push(chunk.data);
  }
  onProgress?.(meta.chunkCount, meta.chunkCount);
  await backupLocalCopy(storage, dossierId);
  await storage.importDossier(parts.join(""), { keepIds: true });
  if (!uploadId) {
    // Cet appareil repart de la copie en ligne : la prochaine sauvegarde automatique ne verra pas de conflit.
    saveSyncBase(dossierId, { signature: dossierSignature(storage.load(), dossierId), remoteUploadedAt: meta.uploadedAt });
  }
}

/** Avant qu'une copie en ligne ne remplace celle de cet appareil, celle-ci est mise de côté (sauvegardes du dossier). */
async function backupLocalCopy(storage: InvestigationStorage, dossierId: string): Promise<void> {
  const data = storage.load();
  const dossier = data.dossiers.find((item) => item.id === dossierId);
  if (!dossier || dossierContentCount(data, dossierId) === 0) return;
  const count = (items: { dossierId: string }[]) => items.filter((item) => item.dossierId === dossierId).length;
  try {
    const json = await storage.exportDossier(dossierId);
    const meta: BackupMeta = {
      id: crypto.randomUUID(),
      dossierId,
      dossierName: dossier.name,
      createdAt: new Date().toISOString(),
      kind: "before-restore",
      entities: count(data.entities),
      relations: count(data.relations),
      notes: count(data.notes),
      sources: count(data.sources),
      bytes: json.length,
    };
    await saveBackup(meta, json);
  } catch {
    // IndexedDB indisponible : on ne bloque pas la récupération, l'utilisateur l'a demandée.
  }
}
