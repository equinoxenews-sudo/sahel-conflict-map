import { stripMarkup } from "./citationTags";

/**
 * Titre de synthèse de zone : sujets courts séparés par « / », sans point
 * final. Les majuscules sont appliquées en CSS (text-transform). Les titres
 * déjà enregistrés au format phrase gardent leur forme, mais les « ; » qui
 * séparaient leurs sujets deviennent « / » et le point final disparaît.
 */
export function formatHeadline(text: string): string {
  return stripMarkup(text)
    .replace(/\s*;\s*/g, " / ")
    .replace(/[.\s]+$/, "")
    .trim();
}
