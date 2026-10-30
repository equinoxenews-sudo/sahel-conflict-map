// Sauvegardes datées d'un dossier, gardées dans IndexedDB (base séparée de celle des images et de
// localStorage). Elles protègent d'une fausse manipulation, d'un écrasement ou d'une perte
// partielle : on peut revenir à une version précédente du dossier. Rien n'est envoyé à un serveur.
// Une sauvegarde contient le dossier complet, images comprises (même format que l'export JSON).
import { scopedKey } from "./scope";

export type BackupKind = "manual" | "auto" | "before-restore";

export interface BackupMeta {
  id: string;
  dossierId: string;
  dossierName: string;
  /** Date ISO de création. */
  createdAt: string;
  kind: BackupKind;
  entities: number;
  relations: number;
  notes: number;
  sources: number;
  /** Taille du fichier JSON, en caractères. */
  bytes: number;
}

export interface BackupCounts {
  entities: number;
  relations: number;
  notes: number;
  sources: number;
}

export const MAX_MANUAL_BACKUPS = 20;
export const MAX_AUTO_BACKUPS = 8;
/** Délai minimal entre deux sauvegardes automatiques. */
export const AUTO_BACKUP_INTERVAL_MS = 3 * 60 * 60 * 1000;
/** Une chute du contenu au-delà de ce ratio (par rapport à la dernière sauvegarde) n'est jamais sauvegardée
 * automatiquement : cela ferait tourner les bonnes sauvegardes au profit d'une version abîmée. */
const AUTO_DROP_RATIO = 0.8;

export function contentSize(counts: BackupCounts): number {
  return counts.entities + counts.relations + counts.notes + counts.sources;
}

/** Faut-il faire une sauvegarde automatique maintenant ? `latest` : la plus récente de ce dossier. */
export function shouldAutoBackup(latest: BackupMeta | null, current: BackupCounts, now: number): boolean {
  const size = contentSize(current);
  if (size === 0) return false;
  if (!latest) return true;
  if (now - Date.parse(latest.createdAt) < AUTO_BACKUP_INTERVAL_MS) return false;
  const previous = contentSize(latest);
  if (size < previous * AUTO_DROP_RATIO) return false;
  const identical =
    current.entities === latest.entities &&
    current.relations === latest.relations &&
    current.notes === latest.notes &&
    current.sources === latest.sources;
  return !identical;
}

/** Identifiants à supprimer pour respecter les plafonds (les plus anciennes d'abord). */
export function backupsToDelete(list: BackupMeta[]): string[] {
  const byNewest = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const auto = byNewest.filter((b) => b.kind === "auto");
  const kept = byNewest.filter((b) => b.kind !== "auto");
  return [...auto.slice(MAX_AUTO_BACKUPS), ...kept.slice(MAX_MANUAL_BACKUPS)].map((b) => b.id);
}

// --- IndexedDB -----------------------------------------------------------------------------

const DB_BASE_NAME = "equinoxe-investigation-backups";
const META = "meta";
const DATA = "data";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(scopedKey(DB_BASE_NAME), 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      const meta = db.createObjectStore(META, { keyPath: "id" });
      meta.createIndex("dossierId", "dossierId");
      db.createObjectStore(DATA);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB indisponible"));
  });
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function done(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error("Sauvegarde interrompue"));
  });
}

export async function listBackups(dossierId: string): Promise<BackupMeta[]> {
  const db = await openDb();
  try {
    const store = db.transaction(META, "readonly").objectStore(META);
    const all = await promisify<BackupMeta[]>(store.index("dossierId").getAll(dossierId));
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } finally {
    db.close();
  }
}

export async function getBackupJson(id: string): Promise<string | null> {
  const db = await openDb();
  try {
    const value = await promisify<string | undefined>(db.transaction(DATA, "readonly").objectStore(DATA).get(id));
    return value ?? null;
  } finally {
    db.close();
  }
}

export async function deleteBackup(id: string): Promise<void> {
  const db = await openDb();
  try {
    const transaction = db.transaction([META, DATA], "readwrite");
    transaction.objectStore(META).delete(id);
    transaction.objectStore(DATA).delete(id);
    await done(transaction);
  } finally {
    db.close();
  }
}

/** Enregistre une sauvegarde, puis supprime les plus anciennes au-delà des plafonds. */
export async function saveBackup(meta: BackupMeta, json: string): Promise<void> {
  const db = await openDb();
  try {
    const transaction = db.transaction([META, DATA], "readwrite");
    transaction.objectStore(META).put(meta);
    transaction.objectStore(DATA).put(json, meta.id);
    await done(transaction);
  } finally {
    db.close();
  }
  const surplus = backupsToDelete(await listBackups(meta.dossierId));
  for (const id of surplus) await deleteBackup(id).catch(() => undefined);
}
