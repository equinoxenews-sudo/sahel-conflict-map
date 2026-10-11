import { stripMarkup } from "./citationTags";

/**
 * Titre de synthèse de zone : sujets courts séparés par « / », sans point
 * final. Les titres déjà enregistrés au format phrase gardent leur forme, mais
 * les « ; » qui séparaient leurs sujets deviennent « / » et le point final
 * disparaît.
 */
export function formatHeadline(text: string): string {
  return stripMarkup(text)
    .replace(/\s*;\s*/g, " / ")
    .replace(/[.\s]+$/, "")
    .trim();
}

/** Les sujets du titre, un par élément, première lettre en capitale. Un titre
 * sans « / » donne un seul sujet. */
export function headlineTopics(text: string): string[] {
  return formatHeadline(text)
    .split(/\s+\/\s+/)
    .map((topic) => topic.trim())
    .filter(Boolean)
    .map((topic) => topic.charAt(0).toLocaleUpperCase("fr-FR") + topic.slice(1));
}
