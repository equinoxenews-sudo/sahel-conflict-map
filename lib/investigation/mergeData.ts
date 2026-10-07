import type { MergePlan } from "./merge";
import { getRelationType } from "./relationTypes";
import type { InvestigationData, Note, Relation } from "./types";
import { normalizeKey, replaceLinkTarget, uniqueTitle } from "./wikilinks";

// Application d'une fusion à l'ensemble des données d'un dossier : fonction pure
// (renvoie de nouvelles données, ne modifie rien). Elle déplace les relations, les
// pages de coordonnées et la fiche texte de la seconde fiche vers la principale,
// réécrit les liens [[…]] et supprime la seconde fiche.

function relationKey(relation: Relation): string {
  const type = getRelationType(relation.typeKey);
  const kind = relation.typeKey ?? normalizeKey(relation.label);
  const ends = type?.symmetric
    ? [relation.sourceEntityId, relation.targetEntityId].sort().join("|")
    : `${relation.sourceEntityId}|${relation.targetEntityId}`;
  return `${ends}|${kind}`;
}

function appendSection(body: string, title: string, addition: string): string {
  if (!addition.trim()) return body;
  return `${body.trimEnd()}${body.trim() ? "\n\n" : ""}## Fusionné depuis « ${title} »\n\n${addition.trim()}\n`;
}

export function applyEntityMerge(
  data: InvestigationData,
  primaryId: string,
  secondaryId: string,
  plan: MergePlan
): InvestigationData | null {
  const primary = data.entities.find((e) => e.id === primaryId);
  const secondary = data.entities.find((e) => e.id === secondaryId);
  if (!primary || !secondary || primaryId === secondaryId) return null;
  const finalName = plan.patch.name;

  // Entités : la principale reçoit le résultat, la seconde disparaît.
  const entities = data.entities
    .filter((e) => e.id !== secondaryId)
    .map((e) => (e.id === primaryId ? { ...e, ...plan.patch } : e));

  // Relations : celles de la seconde passent à la principale ; un lien d'elle-même à
  // elle-même (par exemple « possible doublon ») disparaît ; les doublons sont réunis.
  const moved = data.relations
    .map((r) => ({
      ...r,
      sourceEntityId: r.sourceEntityId === secondaryId ? primaryId : r.sourceEntityId,
      targetEntityId: r.targetEntityId === secondaryId ? primaryId : r.targetEntityId,
    }))
    .filter((r) => r.sourceEntityId !== r.targetEntityId);
  const kept = new Map<string, Relation>();
  for (const relation of moved) {
    const key = relationKey(relation);
    const known = kept.get(key);
    if (!known) kept.set(key, relation);
    else {
      if (relation.status === "documented") known.status = "documented";
      known.confidence = Math.max(known.confidence, relation.confidence);
      known.justifyingSourceId = known.justifyingSourceId ?? relation.justifyingSourceId;
    }
  }
  const relations = [...kept.values()];

  // Notes.
  let notes: Note[] = data.notes.map((n) => ({ ...n }));
  const deleted = new Set<string>();

  // 1. Pages de coordonnées de la seconde fiche.
  for (const note of notes) {
    if (note.attributeRef?.entityId !== secondaryId) continue;
    const attributeId = plan.attributeMap[note.attributeRef.attributeId] ?? note.attributeRef.attributeId;
    const existing = notes.find(
      (other) => other !== note && !deleted.has(other.id) && other.attributeRef?.entityId === primaryId && other.attributeRef.attributeId === attributeId
    );
    if (existing) {
      existing.body = appendSection(existing.body, secondary.name, note.body);
      existing.linkedSourceIds = [...new Set([...existing.linkedSourceIds, ...note.linkedSourceIds])];
      deleted.add(note.id);
    } else {
      note.attributeRef = { entityId: primaryId, attributeId };
    }
  }

  // 2. Fiches texte.
  const primaryFiche = notes.find((n) => n.entityId === primaryId && !deleted.has(n.id));
  const secondaryFiche = notes.find((n) => n.entityId === secondaryId && !deleted.has(n.id));
  const retitled = new Map<string, string>(); // ancien titre → nouveau titre, pour les liens [[…]]
  let ficheId: string | undefined = primaryFiche?.id;
  if (primaryFiche && secondaryFiche) {
    primaryFiche.body = appendSection(primaryFiche.body, secondary.name, secondaryFiche.body);
    primaryFiche.linkedSourceIds = [...new Set([...primaryFiche.linkedSourceIds, ...secondaryFiche.linkedSourceIds])];
    deleted.add(secondaryFiche.id);
    retitled.set(secondaryFiche.title, finalName);
  } else if (secondaryFiche) {
    secondaryFiche.entityId = primaryId;
    ficheId = secondaryFiche.id;
  }
  retitled.set(secondary.name, finalName);

  notes = notes.filter((n) => !deleted.has(n.id));

  // 3. La fiche garde le nom de l'entité (titre unique) ; les liens qui visaient l'ancien titre suivent.
  const fiche = notes.find((n) => n.id === ficheId);
  if (fiche && normalizeKey(fiche.title) !== normalizeKey(finalName)) {
    const title = uniqueTitle(finalName, notes, fiche.id);
    retitled.set(fiche.title, title);
    fiche.title = title;
  }
  for (const note of notes) {
    for (const [from, to] of retitled) note.body = replaceLinkTarget(note.body, from, to);
    note.linkedEntityIds = [...new Set(note.linkedEntityIds.map((id) => (id === secondaryId ? primaryId : id)))];
  }

  return { ...data, entities, relations, notes };
}
