import { freePosition } from "./layout";
import type { InvestigationStorage } from "./storage";
import type { EntityType, InvestigationEntity, Note } from "./types";
import { replaceLinkTarget, uniqueTitle } from "./wikilinks";

// Une fiche est la note texte d'une entité du graphe : même nom, une seule par
// entité. Créer une fiche depuis le texte crée aussi sa carte dans le graphe, et
// l'inverse.

/** La fiche de l'entité ; elle est créée (vide) si elle n'existe pas encore. */
export function ensureFiche(storage: InvestigationStorage, notes: Note[], entity: InvestigationEntity): Note {
  const existing = notes.find((note) => note.entityId === entity.id);
  if (existing) return existing;
  return storage.addNote({
    dossierId: entity.dossierId,
    title: uniqueTitle(entity.name, notes),
    body: "",
    claimType: "observed",
    linkedSourceIds: [],
    linkedEntityIds: [entity.id],
    entityId: entity.id,
  });
}

/** Nouvelle entité du graphe et sa fiche texte. */
export function createFiche(
  storage: InvestigationStorage,
  dossierId: string,
  entities: InvestigationEntity[],
  notes: Note[],
  type: EntityType,
  name: string
): Note {
  const entity = storage.addEntity({
    dossierId,
    type,
    name: name.trim(),
    aliases: [],
    notes: "",
    position: freePosition(entities.map((e) => e.position)),
  });
  return ensureFiche(storage, notes, entity);
}

/** Renomme une note : les liens [[…]] des autres notes qui la désignaient suivent,
 * et la carte du graphe aussi s'il s'agit d'une fiche. Renvoie le titre retenu
 * (rendu unique si un autre porte déjà ce nom). */
export function renameNote(storage: InvestigationStorage, notes: Note[], note: Note, requested: string): string {
  const title = uniqueTitle(requested, notes, note.id);
  if (title === note.title) return title;
  for (const other of notes) {
    if (other.id === note.id) continue;
    const body = replaceLinkTarget(other.body, note.title, title);
    if (body !== other.body) storage.updateNote(other.id, { body });
  }
  storage.updateNote(note.id, { title });
  if (note.entityId) storage.updateEntity(note.entityId, { name: title });
  return title;
}
