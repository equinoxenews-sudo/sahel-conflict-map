// Export d'une fiche en image PNG. La fiche est rendue dans une version « à imprimer » (FicheSheet),
// hors écran, puis photographiée ; le calcul de netteté est partagé avec l'export du graphe.
import { fitPixelRatio, type ExportQuality } from "./exportImage";

export interface FicheExportOptions {
  background: "dark" | "light";
  quality: ExportQuality;
}

export const SHEET_WIDTH = 920;

/** Format de la feuille : hauteur selon le contenu, portrait (rapport A4) ou paysage (diapo 16:9, en deux colonnes). */
export type FicheLayout = "auto" | "portrait" | "landscape";

/** Largeur et hauteur minimale de la feuille (la hauteur grandit si le contenu est plus long). */
export function sheetSize(layout: FicheLayout): { width: number; minHeight: number } {
  if (layout === "landscape") return { width: 1600, minHeight: 900 };
  if (layout === "portrait") return { width: SHEET_WIDTH, minHeight: Math.round(SHEET_WIDTH * Math.SQRT2) };
  return { width: SHEET_WIDTH, minHeight: 0 };
}

export const SHEET_BACKGROUND = { dark: "#0b1220", light: "#ffffff" } as const;

const TRANSPARENT_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const TIMEOUT_MS = 40_000;

const nextFrame = () =>
  new Promise<void>((resolve) => {
    const fallback = window.setTimeout(resolve, 120);
    requestAnimationFrame(() => {
      window.clearTimeout(fallback);
      resolve();
    });
  });

/** Attend que les images de la fiche soient chargées (au plus quelques secondes : une image manquante ne bloque pas). */
async function waitForImages(root: HTMLElement): Promise<void> {
  const pending = [...root.querySelectorAll("img")].filter((image) => !image.complete);
  if (pending.length === 0) return;
  await Promise.race([
    Promise.all(pending.map((image) => new Promise<void>((resolve) => { image.addEventListener("load", () => resolve(), { once: true }); image.addEventListener("error", () => resolve(), { once: true }); }))),
    new Promise<void>((resolve) => window.setTimeout(resolve, 5000)),
  ]);
}

function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), TIMEOUT_MS);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/** Photographie la fiche affichée dans `sheet` et renvoie le PNG. */
export async function renderFichePng(sheet: HTMLElement, options: FicheExportOptions): Promise<Blob> {
  await nextFrame();
  await nextFrame();
  await waitForImages(sheet);
  const { toPng } = await import("html-to-image");
  const width = sheet.offsetWidth;
  const height = sheet.offsetHeight;
  if (width === 0 || height === 0) throw new Error("Rien à exporter : la fiche n'est pas affichée.");

  const capture = (pixelRatio: number) =>
    withTimeout(
      toPng(sheet, {
        skipFonts: true,
        width,
        height,
        pixelRatio,
        backgroundColor: SHEET_BACKGROUND[options.background],
        imagePlaceholder: TRANSPARENT_PIXEL,
      }),
      "L'export prend trop de temps : essaie avec une netteté plus basse."
    );

  let ratio = fitPixelRatio(width, height, options.quality);
  let url: string;
  try {
    url = await capture(ratio);
  } catch (failure) {
    if (failure instanceof Error && failure.message.startsWith("L'export prend trop")) throw failure;
    // Un appareil peut refuser une image trop grande : une seconde tentative, deux fois moins nette.
    ratio = Math.max(0.25, ratio / 2);
    url = await capture(ratio);
  }
  return await (await fetch(url)).blob();
}

/** Nom du fichier : titre de la fiche sans accents ni caractères spéciaux, plus la date. */
export function ficheFileName(title: string, now: Date = new Date()): string {
  const base = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${base || "fiche"}-${now.toISOString().slice(0, 10)}.png`;
}
