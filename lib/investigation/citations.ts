// Références à une source dans le texte d'une note : [^ID], où ID est l'identifiant de la source du
// dossier. En lecture, chaque référence devient un repère numéroté [1], [2]… dans l'ordre d'apparition,
// avec la liste « Références » en bas de la note. Une source peut être une adresse (URL) ou un document.

const CITATION = /\[\^([\w-]+)\]/g;

/** Texte à insérer pour citer une source. */
export function citationToken(sourceId: string): string {
  return `[^${sourceId}]`;
}

/** Identifiants des sources citées dans un texte, dans l'ordre de première apparition, sans doublon. */
export function extractCitationIds(body: string): string[] {
  return [...new Set([...body.matchAll(CITATION)].map((match) => match[1]))];
}

/** Numéro (à partir de 1) de chaque source citée, dans l'ordre de première apparition. */
export function citationNumbers(body: string): Map<string, number> {
  return new Map(extractCitationIds(body).map((id, index) => [id, index + 1]));
}

/** Remplace des identifiants de sources (import d'un dossier : ils sont régénérés). */
export function replaceCitationIds(body: string, mapping: Map<string, string>): string {
  return body.replace(CITATION, (whole, id: string) => {
    const next = mapping.get(id);
    return next ? `[^${next}]` : whole;
  });
}

/** Insère `token` à la position donnée, au fil du texte (sans retour à la ligne) ; `next` suit l'insertion. */
export function insertInline(text: string, position: number, token: string): { text: string; next: number } {
  const at = Math.max(0, Math.min(position, text.length));
  return { text: text.slice(0, at) + token + text.slice(at), next: at + token.length };
}
