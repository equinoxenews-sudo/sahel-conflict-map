import { SOCIAL_PLATFORMS } from "./attributes";
import { freePosition } from "./layout";
import type { InvestigationStorage } from "./storage";
import { ATTRIBUTE_KIND_LABELS, type EntityAttribute, type EntityType, type InvestigationEntity, type Note } from "./types";
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

/** Nom court d'une coordonnée : « TikTok », « Téléphone », « Immatriculation »… */
export function attributeLabel(attribute: EntityAttribute): string {
  if (attribute.kind === "social") return SOCIAL_PLATFORMS[attribute.platform ?? "other"].label;
  if (attribute.kind === "identifier" && attribute.label?.trim()) return attribute.label.trim();
  return ATTRIBUTE_KIND_LABELS[attribute.kind];
}

/** La page d'une coordonnée : une note libre où consigner ce qu'on sait de ce téléphone,
 * de ce compte ou de cette adresse (texte, liens, captures d'écran). Créée au premier clic. */
export function ensureAttributePage(
  storage: InvestigationStorage,
  notes: Note[],
  entity: InvestigationEntity,
  attribute: EntityAttribute
): Note {
  const existing = notes.find((note) => note.attributeRef?.entityId === entity.id && note.attributeRef.attributeId === attribute.id);
  if (existing) return existing;
  return storage.addNote({
    dossierId: entity.dossierId,
    title: uniqueTitle(`${entity.name} — ${attributeLabel(attribute)} ${attribute.value.trim()}`, notes),
    body: "",
    claimType: attribute.status === "hypothesis" ? "hypothesis" : "observed",
    linkedSourceIds: attribute.sourceId ? [attribute.sourceId] : [],
    linkedEntityIds: [entity.id],
    attributeRef: { entityId: entity.id, attributeId: attribute.id },
  });
}
