// Images insérées dans le texte d'une note : ![légende](img:ID), où ID est la clé
// de l'image dans IndexedDB (lib/investigation/imageStore.ts). Captures d'écran,
// photos, documents : la légende sert de description et de date de collecte.

const IMAGE_REF = /!\[[^\]\n]*\]\(img:([\w-]+)\)/g;

/** Texte à insérer pour une image importée. */
export function imageToken(id: string, caption = ""): string {
  return `![${caption.replace(/[\]\n]/g, " ").trim()}](img:${id})`;
}

/** Identifiants des images citées dans un texte, sans doublon. */
export function extractImageIds(body: string): string[] {
  return [...new Set([...body.matchAll(IMAGE_REF)].map((match) => match[1]))];
}

/** Le texte sans l'image donnée (suppression depuis la galerie). */
export function removeImageToken(body: string, id: string): string {
  const safeId = id.replace(/[^\w-]/g, "");
  const line = new RegExp(`^[ \\t]*!\\[[^\\]\\n]*\\]\\(img:${safeId}\\)[ \\t]*\\n?`, "gm");
  const inline = new RegExp(`!\\[[^\\]\\n]*\\]\\(img:${safeId}\\)`, "g");
  return body.replace(line, "").replace(inline, "").replace(/\n{3,}/g, "\n\n");
}

/** Remplace des identifiants d'images (import d'un dossier : ils sont régénérés). */
export function replaceImageIds(body: string, mapping: Map<string, string>): string {
  return body.replace(/(!\[[^\]\n]*\]\(img:)([\w-]+)(\))/g, (whole, start: string, id: string, end: string) => {
    const next = mapping.get(id);
    return next ? `${start}${next}${end}` : whole;
  });
}

/** Insère `token` à la position donnée, sur sa propre ligne ; `next` est la position qui suit. */
export function insertTokenAt(text: string, position: number, token: string): { text: string; next: number } {
  const at = Math.max(0, Math.min(position, text.length));
  const before = text.slice(0, at);
  const after = text.slice(at);
  const insertion = `${before && !before.endsWith("\n") ? "\n" : ""}${token}\n`;
  return { text: before + insertion + after, next: at + insertion.length };
}
