import type { Relation } from "./types";
import { normalizeKey } from "./wikilinks";

// Catalogue des types de relations. Chaque type se lit dans les deux sens :
// « A dirige B » (libellé) / « B est dirigé par A » (inverse). Une relation
// symétrique (« travaille avec ») se lit pareil dans les deux sens. Un type peut
// aussi dire quelle extrémité est « au-dessus » : c'est ce qui range le graphe en arbre.

export type RelationFamily = "organisation" | "personne" | "materiel" | "evenement" | "general";

export const RELATION_FAMILY_LABELS: Record<RelationFamily, string> = {
  organisation: "Organisations",
  personne: "Personnes",
  materiel: "Matériel, lieux, édifices",
  evenement: "Événements et comptes",
  general: "Général",
};

export interface RelationType {
  key: string;
  family: RelationFamily;
  /** Lecture de la source vers la cible. */
  label: string;
  /** Lecture de la cible vers la source (égale à `label` si la relation est symétrique). */
  inverse: string;
  symmetric: boolean;
  /** Extrémité située au-dessus dans une hiérarchie ; absent = relation latérale. */
  parent?: "source" | "target";
}

function directed(key: string, family: RelationFamily, label: string, inverse: string, parent?: "source" | "target"): RelationType {
  return { key, family, label, inverse, symmetric: false, parent };
}

function symmetric(key: string, family: RelationFamily, label: string): RelationType {
  return { key, family, label, inverse: label, symmetric: true };
}

export const RELATION_TYPES: readonly RelationType[] = [
  // Organisations
  directed("subsidiary", "organisation", "a pour filiale", "est une filiale de", "source"),
  directed("member_of", "organisation", "est membre de", "compte parmi ses membres", "target"),
  directed("funds", "organisation", "finance", "est financé par"),
  symmetric("partner", "organisation", "est partenaire de"),
  symmetric("works_with", "organisation", "travaille avec"),
  // Personnes
  directed("leads", "personne", "dirige", "est dirigé par", "target"),
  directed("chief_of", "personne", "est chef de", "est sous les ordres de", "source"),
  directed("employed_by", "personne", "travaille pour", "emploie", "target"),
  symmetric("colleague", "personne", "est collègue de"),
  symmetric("family", "personne", "est de la famille de"),
  symmetric("knows", "personne", "est en relation avec"),
  // Matériel, lieux, édifices
  directed("uses", "materiel", "utilise", "est utilisé par"),
  directed("owns", "materiel", "possède", "appartient à", "source"),
  directed("located_at", "materiel", "est situé à", "accueille", "target"),
  directed("made_by", "materiel", "est fabriqué par", "fabrique", "target"),
  // Événements et comptes
  directed("participates_in", "evenement", "participe à", "réunit"),
  directed("organized", "evenement", "a organisé", "a été organisé par", "source"),
  directed("administers", "evenement", "administre", "est administré par", "source"),
  directed("account_of", "evenement", "est le compte de", "a pour compte", "target"),
  // Général
  symmetric("related", "general", "est lié à"),
  directed("mentions", "general", "mentionne", "est mentionné par"),
  // Doublon possible : jamais fusionné automatiquement (voir lib/investigation/duplicates.ts)
  symmetric("possible_duplicate", "general", "est peut-être la même entité que"),
];

export const CUSTOM_RELATION_KEY = "custom";
export const DUPLICATE_RELATION_KEY = "possible_duplicate";

const BY_KEY = new Map(RELATION_TYPES.map((type) => [type.key, type]));

export function getRelationType(key: string | undefined): RelationType | null {
  return key ? (BY_KEY.get(key) ?? null) : null;
}

export interface ResolvedRelationType {
  type: RelationType;
  /** Le libellé enregistré se lit de la cible vers la source (relation ancienne saisie à l'envers). */
  reversed: boolean;
}

/** Type d'une relation : celui qui est enregistré, sinon celui que son libellé libre
 * reproduit exactement (relations créées avant le catalogue). Sans correspondance, null. */
export function resolveRelationType(relation: Pick<Relation, "typeKey" | "label">): ResolvedRelationType | null {
  const known = getRelationType(relation.typeKey);
  if (known) return { type: known, reversed: false };
  const key = normalizeKey(relation.label);
  if (!key) return null;
  for (const type of RELATION_TYPES) {
    if (normalizeKey(type.label) === key) return { type, reversed: false };
    if (!type.symmetric && normalizeKey(type.inverse) === key) return { type, reversed: true };
  }
  return null;
}

/** Libellé affiché sur le trait du graphe (lecture de la source vers la cible). */
export function edgeLabel(relation: Pick<Relation, "typeKey" | "label">): string {
  const known = getRelationType(relation.typeKey);
  return known ? known.label : relation.label;
}

export interface RelationPhrase {
  /** Ce que dit la relation du point de vue de l'entité : « dirige », « est dirigé par »… */
  text: string;
  otherId: string;
  /** Vrai si l'entité est la source de la relation. */
  outgoing: boolean;
}

/** La relation lue depuis une entité (fiche texte, liste des relations). */
export function phraseFrom(relation: Relation, entityId: string): RelationPhrase | null {
  const outgoing = relation.sourceEntityId === entityId;
  if (!outgoing && relation.targetEntityId !== entityId) return null;
  const otherId = outgoing ? relation.targetEntityId : relation.sourceEntityId;
  const type = getRelationType(relation.typeKey);
  if (!type) return { text: relation.label, otherId, outgoing };
  return { text: outgoing || type.symmetric ? type.label : type.inverse, otherId, outgoing };
}

/** Lien hiérarchique d'une relation (parent au-dessus, enfant en dessous), ou null si elle est latérale. */
export function hierarchyOf(relation: Relation): { parent: string; child: string } | null {
  const resolved = resolveRelationType(relation);
  if (!resolved?.type.parent) return null;
  const sourceIsParent = (resolved.type.parent === "source") !== resolved.reversed;
  return sourceIsParent
    ? { parent: relation.sourceEntityId, child: relation.targetEntityId }
    : { parent: relation.targetEntityId, child: relation.sourceEntityId };
}

export function isDuplicateRelation(relation: Pick<Relation, "typeKey">): boolean {
  return relation.typeKey === DUPLICATE_RELATION_KEY;
}
