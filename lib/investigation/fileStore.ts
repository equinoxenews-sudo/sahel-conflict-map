// Documents-preuves d'une source (PDF, photos, captures) : stockés dans IndexedDB, dans une base à part
// de celle des images des fiches. Le fichier reste dans le navigateur ; seule sa description (nom, type,
// taille) est dans la source. Les fichiers suivent l'export JSON du dossier, la sauvegarde manuelle et la
// copie en ligne, comme les images.
import { scopedKey } from "./scope";

const DB_BASE_NAME = "equinoxe-investigation-files";
const STORE = "files";

/** Taille maximale d'un document-preuve. */
export const PROOF_MAX_BYTES = 10 * 1024 * 1024;
/** Au-delà, les fichiers d'un dossier alourdissent les exports et la synchronisation : on prévient. */
export const PROOF_WARN_TOTAL_BYTES = 50 * 1024 * 1024;

export const PROOF_ACCEPT = "application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp,.gif";

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};
const ACCEPTED_MIMES = new Set(Object.values(MIME_BY_EXTENSION));

/** Type réel d'un fichier choisi : celui du navigateur, sinon déduit de l'extension. */
export function proofMime(file: { name: string; type: string }): string | null {
  if (ACCEPTED_MIMES.has(file.type)) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[extension] ?? null;
}

/** Message d'erreur si le fichier ne peut pas servir de document-preuve, sinon null. */
export function validateProofFile(file: { name: string; type: string; size: number }): string | null {
  if (!proofMime(file)) return "Format non pris en charge : utilise un PDF, un JPG, un PNG, un WebP ou un GIF.";
  if (file.size === 0) return "Ce fichier est vide.";
  if (file.size > PROOF_MAX_BYTES) return `Fichier trop lourd (${formatFileSize(file.size)}) : ${formatFileSize(PROOF_MAX_BYTES)} au maximum.`;
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(scopedKey(DB_BASE_NAME), 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB indisponible"));
  });
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = action(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
      })
  );
}

export async function putFile(blob: Blob, id: string = crypto.randomUUID()): Promise<string> {
  await run("readwrite", (store) => store.put(blob, id));
  return id;
}

export async function getFile(id: string): Promise<Blob | null> {
  const blob = await run<Blob | undefined>("readonly", (store) => store.get(id));
  return blob ?? null;
}

export async function deleteFile(id: string): Promise<void> {
  await run("readwrite", (store) => store.delete(id));
}

/** Ouvre un document dans un nouvel onglet (le navigateur affiche les PDF et les images). Faux si le fichier est absent. */
export async function openFile(id: string): Promise<boolean> {
  const blob = await getFile(id);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  // L'adresse temporaire est libérée un peu plus tard : l'onglet a le temps de la lire.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}
