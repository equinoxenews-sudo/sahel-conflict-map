// Photo de présentation d'un dossier (vignette des pages Notes et Menu). Réduite côté navigateur puis gardée DANS le
// dossier, sous forme d'adresse « data: » : elle suit ainsi la copie en ligne, l'export JSON et les sauvegardes sans
// passer par IndexedDB. Quelques dizaines de Ko par dossier.
import { blobToDataUrl, prepareImage } from "./imageStore";

const COVER_MAX_SIDE_PX = 480;
const COVER_QUALITY = 0.8;

/** Seules les images « data: » sont affichées : un fichier importé ne peut pas faire charger une adresse externe. */
export function isCoverImage(value: unknown): value is string {
  return typeof value === "string" && /^data:image\/(png|jpeg|webp|gif);base64,/.test(value);
}

/** Image choisie par l'utilisateur → adresse « data: » réduite. Lève ImageFileError si le fichier n'est pas une image. */
export async function coverFromFile(file: Blob): Promise<string> {
  return blobToDataUrl(await prepareImage(file, COVER_MAX_SIDE_PX, COVER_QUALITY));
}
