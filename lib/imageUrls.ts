// Noms de fichiers qui désignent un logo, une icône ou un pixel de suivi
// plutôt qu'une photo d'article. Seul le nom du fichier est testé : « default »
// ou « icon » dans un chemin (/sites/default/files/…) est parfaitement normal.
const JUNK_FILENAME = /(logo|favicon|placeholder|sprite|blank|pixel|avatar|spacer|icon)/i;
const UNSUPPORTED_EXT = /\.(svg|gif|ico)(\?|#|$)/i;

/** Adresse absolue http(s) d'une image, résolue par rapport à la page qui la
 * cite (les og:image relatives ou en « //cdn… » sont fréquentes) ; null si
 * l'adresse est invalide ou désigne manifestement un logo ou une icône. */
export function normalizeImageUrl(raw: string | null | undefined, baseUrl?: string): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = baseUrl ? new URL(trimmed, baseUrl) : new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (UNSUPPORTED_EXT.test(url.pathname)) return null;
  const filename = url.pathname.split("/").pop() ?? "";
  if (JUNK_FILENAME.test(filename)) return null;
  return url.toString();
}

/** Les images de Telegram (cdn*.telesco.pe) expirent au bout de quelques heures : elles passent
 *  par le relais /api/thumb, qui retrouve au besoin l'image actuelle du message d'origine. */
export function isTelegramImage(url: string): boolean {
  try {
    return /(^|\.)telesco\.pe$/.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Adresse à afficher pour l'image d'un article. */
export function briefImageSrc<T extends string | null | undefined>(url: T): T | string {
  return url && isTelegramImage(url) ? `/api/thumb?url=${encodeURIComponent(url)}` : url;
}
