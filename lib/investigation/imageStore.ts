// Images des fiches (photos, logos) importées depuis l'ordinateur. Elles vont
// dans IndexedDB, pas dans localStorage : celui-ci est limité à environ 5 Mo,
// quelques photos suffiraient à le remplir. Rien n'est envoyé à un serveur.
// Une image est réduite avant stockage (côté navigateur) pour rester légère.
const DB_NAME = "equinoxe-investigation-images";
const STORE = "images";
const MAX_SIDE_PX = 512;
/** Captures d'écran et documents : assez grands pour rester lisibles (texte, détails). */
export const NOTE_IMAGE_MAX_SIDE = 1600;
const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
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

export async function putImage(blob: Blob, id: string = crypto.randomUUID()): Promise<string> {
  await run("readwrite", (store) => store.put(blob, id));
  return id;
}

export async function getImage(id: string): Promise<Blob | null> {
  const blob = await run<Blob | undefined>("readonly", (store) => store.get(id));
  return blob ?? null;
}

export async function deleteImage(id: string): Promise<void> {
  revokeImageUrl(id);
  await run("readwrite", (store) => store.delete(id));
}

// Une adresse temporaire (blob:) par image, gardée le temps de la session :
// la recréer à chaque rendu ferait clignoter les cartes du graphe.
const urlCache = new Map<string, Promise<string | null>>();

export function getImageUrl(id: string): Promise<string | null> {
  let cached = urlCache.get(id);
  if (!cached) {
    cached = getImage(id)
      .then((blob) => (blob ? URL.createObjectURL(blob) : null))
      .catch(() => null);
    urlCache.set(id, cached);
  }
  return cached;
}

export function revokeImageUrl(id: string): void {
  const cached = urlCache.get(id);
  urlCache.delete(id);
  void cached?.then((url) => url && URL.revokeObjectURL(url));
}

export class ImageFileError extends Error {}

/** Réduit une image importée (côté navigateur) avant de la stocker. */
export async function prepareImage(file: Blob, maxSide: number = MAX_SIDE_PX): Promise<Blob> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new ImageFileError("Format non pris en charge : utilise une image PNG, JPEG, WebP ou GIF.");
  }
  if (file.size > MAX_INPUT_BYTES) throw new ImageFileError("Image trop lourde (15 Mo maximum).");

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new ImageFileError("Impossible de lire cette image.");
  });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // WebP conserve la transparence des logos ; repli JPEG si le navigateur ne l'encode pas.
  const webp = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  if (!jpeg) throw new ImageFileError("Impossible de convertir cette image.");
  return jpeg;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}
