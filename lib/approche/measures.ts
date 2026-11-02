import type { Observation } from "./schema";

// Deux observations ne sont « d'autres sources sur le même sujet » que si elles mesurent la même grandeur : deux nombres, dans des
// unités de même famille (des personnes, une somme d'argent, une part en %…). Un `topic` large (« politics », « economy »,
// « identity ») ne suffit pas : un chef d'État et une durée de mandat ne sont pas deux versions d'une même valeur.

/** Famille d'unité : personnes (habitants, personnes), argent (USD, EUR, « milliards EUR »…), sinon l'unité elle-même. */
export function unitFamily(unit: string | null): string {
  if (!unit) return "";
  if (unit === "habitants" || unit === "personnes") return "persons";
  if (/(?:^|\s)[A-Z]{3}$/.test(unit)) return "money";
  return unit;
}

export function comparableMeasures(a: Observation, b: Observation): boolean {
  return typeof a.value === "number" && typeof b.value === "number" && unitFamily(a.unit) === unitFamily(b.unit) && unitFamily(a.unit) !== "";
}

/** Vrai si les deux observations ne partagent aucune source (sinon ce sont deux mesures d'un même document, pas deux sources). */
export function disjointSources(a: Observation, b: Observation): boolean {
  return !a.sourceIds.some((id) => b.sourceIds.includes(id));
}

/** `other` s'ouvre dans le volet « Autres sources » de la tuile qui porte `anchor` : même sujet, même grandeur, autre source. */
export function isOtherSourceOf(anchor: Observation, other: Observation): boolean {
  return anchor.id !== other.id && Boolean(anchor.topic) && anchor.topic === other.topic && comparableMeasures(anchor, other) && disjointSources(anchor, other);
}
