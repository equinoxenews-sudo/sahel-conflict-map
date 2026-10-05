import { findCountryByLabel } from "./countries";
import { splitPlace, type SituationItem } from "./situationReport";

export interface PlaceFlag {
  iso2: string;
  name: string;
}

/** Drapeau de chaque lieu qui cite un pays connu (clé : le texte du lieu).
 * Côté serveur : l'index des pays est trop lourd pour le navigateur. Un pays
 * sans profil n'a simplement pas de drapeau. */
export function flagsForItems(items: Pick<SituationItem, "place">[]): Record<string, PlaceFlag> {
  const flags: Record<string, PlaceFlag> = {};
  for (const { place } of items) {
    if (!place || flags[place]) continue;
    const country = findCountryByLabel(splitPlace(place).country);
    if (country) flags[place] = country;
  }
  return flags;
}
