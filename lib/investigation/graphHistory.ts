// Historique du graphe (annuler / rétablir) : un instantané des fiches, relations et formes d'un dossier,
// plus les liens entre les notes et les fiches (qu'une suppression de fiche détache). Fonctions pures :
// le panneau du graphe garde les piles, le stockage applique l'instantané.
import type { InvestigationData, InvestigationEntity, Note, Relation, GraphShape } from "./types";

export interface NoteLink {
  id: string;
  entityId: Note["entityId"];
  attributeRef: Note["attributeRef"];
}

export interface GraphSlice {
  entities: InvestigationEntity[];
  relations: Relation[];
  shapes: GraphShape[];
  noteLinks: NoteLink[];
}

/** Nombre maximal de pas d'annulation gardés. */
export const HISTORY_LIMIT = 50;

export function sliceOf(entities: InvestigationEntity[], relations: Relation[], shapes: GraphShape[], notes: Note[]): GraphSlice {
  return {
    entities,
    relations,
    shapes,
    noteLinks: notes.map((note) => ({ id: note.id, entityId: note.entityId, attributeRef: note.attributeRef })),
  };
}

/** Vrai si les deux listes contiennent exactement les mêmes éléments (mêmes objets, même ordre). */
export function sameItems<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

export function sameGraph(a: GraphSlice, b: GraphSlice): boolean {
  return sameItems(a.entities, b.entities) && sameItems(a.relations, b.relations) && sameItems(a.shapes, b.shapes);
}

/** Ajoute un pas à la pile en gardant au plus HISTORY_LIMIT éléments (les plus récents). */
export function pushLimited<T>(stack: T[], item: T, limit: number = HISTORY_LIMIT): T[] {
  const next = [...stack, item];
  return next.length > limit ? next.slice(next.length - limit) : next;
}

/** Remet le graphe d'un dossier dans l'état de l'instantané ; les autres dossiers et les textes des notes ne bougent pas. */
export function applyGraphSlice(data: InvestigationData, dossierId: string, slice: GraphSlice): InvestigationData {
  const links = new Map(slice.noteLinks.map((link) => [link.id, link]));
  const present = new Set([...data.entities.filter((entity) => entity.dossierId !== dossierId), ...slice.entities].map((entity) => entity.id));
  return {
    ...data,
    entities: [...data.entities.filter((entity) => entity.dossierId !== dossierId), ...slice.entities],
    relations: [...data.relations.filter((relation) => relation.dossierId !== dossierId), ...slice.relations],
    shapes: [...data.shapes.filter((shape) => shape.dossierId !== dossierId), ...slice.shapes],
    notes: data.notes.map((note) => {
      if (note.dossierId !== dossierId) return note;
      const link = links.get(note.id);
      if (link) {
        if (note.entityId === link.entityId && note.attributeRef === link.attributeRef) return note;
        return { ...note, entityId: link.entityId, attributeRef: link.attributeRef };
      }
      // Une note créée depuis : si sa fiche n'existe plus après le retour en arrière, elle devient une note libre.
      const dangling = note.entityId !== undefined && !present.has(note.entityId);
      const danglingAttribute = note.attributeRef !== undefined && !present.has(note.attributeRef.entityId);
      return dangling || danglingAttribute
        ? { ...note, entityId: dangling ? undefined : note.entityId, attributeRef: danglingAttribute ? undefined : note.attributeRef }
        : note;
    }),
  };
}
