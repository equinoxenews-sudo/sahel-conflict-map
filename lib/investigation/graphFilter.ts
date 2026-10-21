// Filtre d'affichage du graphe par catégorie (personnes, organisations, lieux…, formes et textes).
// C'est un réglage de vue, pas une donnée du dossier : masquer une catégorie ne déplace, ne modifie
// et ne supprime rien ; la remettre fait réapparaître les fiches exactement à leur place.
import type { EntityType } from "./types";

/** Catégorie filtrable : un type de fiche, ou les formes et annotations du graphe. */
export type FilterKey = EntityType | "shapes";

export const SHAPES_FILTER = "shapes" as const;

const VALID_ENTITY_TYPES: readonly string[] = ["person", "organization", "company", "location", "building", "equipment", "event", "document", "account", "image"];

export function filterStorageKey(dossierId: string): string {
  return `equinoxe-investigation-graph-filter:${dossierId}`;
}

function isFilterKey(value: unknown): value is FilterKey {
  return typeof value === "string" && (value === SHAPES_FILTER || VALID_ENTITY_TYPES.includes(value));
}

/** Relit les catégories masquées enregistrées ; un contenu illisible donne « rien de masqué ». */
export function parseHidden(raw: string | null): Set<FilterKey> {
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter(isFilterKey) : []);
  } catch {
    return new Set();
  }
}

export function serializeHidden(hidden: Set<FilterKey>): string {
  return JSON.stringify([...hidden].sort());
}

export function toggleHidden(hidden: Set<FilterKey>, key: FilterKey): Set<FilterKey> {
  const next = new Set(hidden);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

export function entityHidden(hidden: Set<FilterKey>, type: EntityType | undefined): boolean {
  return type !== undefined && hidden.has(type);
}

/** Un trait disparaît avec l'une de ses deux fiches. */
export function edgeHidden(hidden: Set<FilterKey>, typeOf: Map<string, EntityType>, sourceId: string, targetId: string): boolean {
  return entityHidden(hidden, typeOf.get(sourceId)) || entityHidden(hidden, typeOf.get(targetId));
}

export interface FilterRow {
  key: FilterKey;
  count: number;
}

/** Catégories présentes dans le dossier, dans l'ordre d'affichage (types de fiches, puis formes). */
export function filterRows(types: EntityType[], shapeCount: number, order: readonly EntityType[]): FilterRow[] {
  const counts = new Map<EntityType, number>();
  for (const type of types) counts.set(type, (counts.get(type) ?? 0) + 1);
  const rows: FilterRow[] = order.filter((type) => counts.has(type)).map((type) => ({ key: type, count: counts.get(type) ?? 0 }));
  if (shapeCount > 0) rows.push({ key: SHAPES_FILTER, count: shapeCount });
  return rows;
}
