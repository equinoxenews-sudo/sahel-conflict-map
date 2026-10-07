import { pivotKey } from "./attributes";
import { isDuplicateRelation } from "./relationTypes";
import type { InvestigationEntity, Relation } from "./types";
import { normalizeKey } from "./wikilinks";

// Détection des doublons possibles : deux fiches du même type qui portent le même
// nom, un alias commun, ou une même coordonnée. Ce ne sont que des SUGGESTIONS :
// rien n'est jamais fusionné sans décision manuelle.

export interface DuplicateCandidate {
  /** Clé stable de la paire (pour « Ignorer »). */
  key: string;
  aId: string;
  bId: string;
  reasons: string[];
}

export function pairKey(aId: string, bId: string): string {
  return [aId, bId].sort().join("|");
}

const SHARED_KIND_LABEL: Record<string, string> = {
  email: "même e-mail",
  phone: "même téléphone",
  social: "même compte",
  website: "même site",
  identifier: "même identifiant",
};

function sharedKeys(a: InvestigationEntity, b: InvestigationEntity): string[] {
  const keysOfB = new Set((b.attributes ?? []).flatMap((attribute) => pivotKey(attribute) ?? []));
  const found = new Set<string>();
  for (const attribute of a.attributes ?? []) {
    const key = pivotKey(attribute);
    if (key && keysOfB.has(key)) found.add(SHARED_KIND_LABEL[key.split(":")[0]] ?? "même coordonnée");
  }
  return [...found];
}

export function findDuplicateCandidates(
  entities: InvestigationEntity[],
  relations: Relation[],
  dismissed: string[] = []
): DuplicateCandidate[] {
  const linked = new Set(relations.filter(isDuplicateRelation).map((r) => pairKey(r.sourceEntityId, r.targetEntityId)));
  const skipped = new Set(dismissed);
  const candidates: DuplicateCandidate[] = [];

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i];
      const b = entities[j];
      if (a.type !== b.type) continue;
      const key = pairKey(a.id, b.id);
      if (linked.has(key) || skipped.has(key)) continue;

      const reasons: string[] = [];
      const namesA = [a.name, ...a.aliases].map(normalizeKey).filter(Boolean);
      const namesB = [b.name, ...b.aliases].map(normalizeKey).filter(Boolean);
      if (normalizeKey(a.name) === normalizeKey(b.name)) reasons.push("même nom");
      else if (namesA.some((name) => namesB.includes(name))) reasons.push("alias commun");
      reasons.push(...sharedKeys(a, b));

      if (reasons.length > 0) candidates.push({ key, aId: a.id, bId: b.id, reasons });
    }
  }
  return candidates.sort((x, y) => y.reasons.length - x.reasons.length);
}
