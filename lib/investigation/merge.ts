import { pivotKey } from "./attributes";
import type { EntityAttribute, InvestigationEntity } from "./types";
import { normalizeKey } from "./wikilinks";

// Fusion manuelle de deux fiches : la fiche principale absorbe la seconde. Ce module
// ne fait que PLANIFIER (fonction pure, testable) ; l'application, d'un seul bloc et
// annulable, est dans lib/investigation/storage.ts (mergeEntities).

export type Side = "primary" | "secondary";

export interface MergeChoices {
  name: Side;
  role: Side;
  country: Side;
  image: Side | "none";
}

export interface MergePlan {
  /** Champs de la fiche principale après fusion. */
  patch: {
    name: string;
    aliases: string[];
    notes: string;
    role?: string;
    countryIso2?: string;
    countryLabel?: string;
    imageId?: string;
    imageUrl?: string;
    attributes: EntityAttribute[];
  };
  /** Coordonnée de la seconde → coordonnée équivalente déjà présente sur la principale. */
  attributeMap: Record<string, string>;
  /** Nombre de coordonnées reprises de la seconde, et de doublons absorbés. */
  attributesAdded: number;
  attributesAbsorbed: number;
}

/** Identité d'une coordonnée pour la fusion : sa clé de pivot, sinon son type et sa valeur normalisée. */
function attributeIdentity(attribute: EntityAttribute): string {
  return pivotKey(attribute) ?? `${attribute.kind}:${normalizeKey(attribute.value)}`;
}

function pick<T>(choice: Side, primary: T | undefined, secondary: T | undefined): T | undefined {
  const chosen = choice === "primary" ? primary : secondary;
  const other = choice === "primary" ? secondary : primary;
  // Le champ choisi est vide : on garde plutôt la valeur de l'autre fiche que de la perdre.
  return chosen !== undefined && chosen !== "" ? chosen : other;
}

export function planEntityMerge(
  primary: InvestigationEntity,
  secondary: InvestigationEntity,
  choices: MergeChoices
): MergePlan {
  const keepSecondaryName = choices.name === "secondary";
  const name = keepSecondaryName ? secondary.name : primary.name;
  const droppedName = keepSecondaryName ? primary.name : secondary.name;

  // Alias : tous ceux des deux fiches, plus le nom abandonné, sans doublon ni le nom retenu.
  const seen = new Set([normalizeKey(name)]);
  const aliases: string[] = [];
  for (const alias of [...primary.aliases, ...secondary.aliases, droppedName]) {
    const key = normalizeKey(alias);
    if (key && !seen.has(key)) {
      seen.add(key);
      aliases.push(alias.trim());
    }
  }

  const notes = [primary.notes.trim(), secondary.notes.trim() && `— Fusionné depuis « ${secondary.name} » :\n${secondary.notes.trim()}`]
    .filter(Boolean)
    .join("\n\n");

  // Drapeau et libellé suivent toujours la même fiche ; si la fiche choisie n'a pas de pays, on prend l'autre.
  const countryChosen = choices.country === "primary" ? primary : secondary;
  const countryOther = choices.country === "primary" ? secondary : primary;
  const countrySide = countryChosen.countryIso2 ? countryChosen : countryOther;

  let imageId: string | undefined;
  let imageUrl: string | undefined;
  if (choices.image !== "none") {
    const chosen = choices.image === "primary" ? primary : secondary;
    imageId = chosen.imageId;
    imageUrl = chosen.imageUrl;
  }

  // Coordonnées : celles de la principale d'abord ; chaque coordonnée de la seconde est
  // reprise, sauf si la principale porte déjà la même (la mieux établie est conservée).
  const attributes = (primary.attributes ?? []).map((attribute) => ({ ...attribute }));
  const byIdentity = new Map(attributes.map((attribute) => [attributeIdentity(attribute), attribute]));
  const attributeMap: Record<string, string> = {};
  let attributesAdded = 0;
  let attributesAbsorbed = 0;
  for (const attribute of secondary.attributes ?? []) {
    const existing = byIdentity.get(attributeIdentity(attribute));
    if (existing) {
      attributeMap[attribute.id] = existing.id;
      attributesAbsorbed++;
      if (attribute.status === "documented") existing.status = "documented";
      if (!existing.sourceId && attribute.sourceId) existing.sourceId = attribute.sourceId;
      if (!existing.secondary && attribute.secondary) existing.secondary = attribute.secondary;
      if (!existing.url && attribute.url) existing.url = attribute.url;
    } else {
      const copy = { ...attribute };
      attributes.push(copy);
      byIdentity.set(attributeIdentity(copy), copy);
      attributesAdded++;
    }
  }

  return {
    patch: {
      name,
      aliases,
      notes,
      role: pick(choices.role, primary.role, secondary.role),
      countryIso2: countrySide.countryIso2,
      countryLabel: countrySide.countryLabel,
      imageId,
      imageUrl,
      attributes,
    },
    attributeMap,
    attributesAdded,
    attributesAbsorbed,
  };
}
