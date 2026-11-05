// Définition de l'indice de puissance Équinoxe (composantes, pondérations, seuils) : sans aucune donnée, pour que le navigateur puisse
// l'afficher sans embarquer les chiffres de tous les pays (voir lib/powerIndex.ts pour le calcul).

export type PowerComponentId = "gdp" | "military" | "population" | "area" | "nuclear";

export interface PowerComponentDefinition {
  id: PowerComponentId;
  label: string;
  weight: number;
  source: string;
}

export const POWER_COMPONENTS: readonly PowerComponentDefinition[] = [
  { id: "gdp", label: "PIB (dollars courants)", weight: 30, source: "Banque mondiale" },
  { id: "military", label: "Dépenses militaires (dollars courants)", weight: 30, source: "SIPRI via la Banque mondiale" },
  { id: "population", label: "Population", weight: 15, source: "Banque mondiale" },
  { id: "area", label: "Superficie", weight: 10, source: "Banque mondiale" },
  { id: "nuclear", label: "Armes nucléaires", weight: 15, source: "États dotés selon le SIPRI et la Federation of American Scientists" },
];

/** États dotés de l'arme nucléaire (liste publique SIPRI / FAS ; Israël ne le déclare pas officiellement). */
export const NUCLEAR_STATES: ReadonlySet<string> = new Set(["USA", "RUS", "GBR", "FRA", "CHN", "IND", "PAK", "ISR", "PRK"]);

/** Une valeur plus ancienne que cela est jugée périmée pour un classement (elle reste affichée ailleurs avec son année). */
export const MAX_AGE_YEARS = 8;
/** Composantes minimales pour qu'un pays reçoive un indice. */
export const MIN_COMPONENTS = 3;
