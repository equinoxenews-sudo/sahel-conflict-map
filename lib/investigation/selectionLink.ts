// Lier un passage du texte à une fiche ou à une note : le passage sélectionné devient [[Fiche|passage]]
// (ou [[Fiche]] si le passage est déjà le nom de la fiche). En lecture, c'est un lien cliquable.

const cleanup = (value: string) => value.replace(/[\r\n|[\]]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * Remplace la sélection [start, end) de `text` par un lien vers `target`.
 * Les espaces au bord de la sélection restent hors du lien. Renvoie null si le lien est impossible :
 * sélection vide, ou sélection à l'intérieur d'un lien [[…]] déjà existant.
 */
export function linkSelection(text: string, start: number, end: number, target: string): { text: string; next: number } | null {
  const from = Math.max(0, Math.min(start, end, text.length));
  const to = Math.min(text.length, Math.max(start, end));
  const raw = text.slice(from, to);
  const lead = raw.length - raw.trimStart().length;
  const trail = raw.length - raw.trimEnd().length;
  const innerFrom = from + lead;
  const innerTo = to - trail;
  if (innerTo <= innerFrom) return null;

  const before = text.slice(0, innerFrom);
  if (before.lastIndexOf("[[") > before.lastIndexOf("]]")) return null;

  const label = cleanup(text.slice(innerFrom, innerTo));
  const name = cleanup(target);
  if (!label || !name) return null;
  const token = label.toLowerCase() === name.toLowerCase() ? `[[${name}]]` : `[[${name}|${label}]]`;
  return { text: text.slice(0, innerFrom) + token + text.slice(innerTo), next: innerFrom + token.length };
}
