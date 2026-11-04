// Familles de clés d'observations lues par l'interface : une clé par branche économique, une par filière d'électricité. Partagé par
// l'onglet Économie et par le rapport du contrat de données (docs/APPROCHE_CHAMPS_UI.md).

/** Branches de la nomenclature d'activités A10 (NACE rév. 2) : `economy.value_added.<code>` et `economy.value_added_share.<code>`. */
export const VALUE_ADDED_BRANCHES = ["A", "B-E", "F", "G-I", "J", "K", "L", "M_N", "O-Q", "R-U"] as const;

/** Mesures d'électricité : `energy.electricity.<clé>`. Seule `production_total` est indispensable au graphique de production. */
export const ELECTRICITY_KEYS = ["production_total", "nuclear", "renewable", "hydro", "wind_solar", "solar", "fossil", "exports_gross", "imports", "net_exports", "consumption", "low_carbon", "low_carbon_share"] as const;

/**
 * Millésimes : une mesure d'un autre exercice porte la clé `energy.electricity.<clé>_<AAAA>` (ex. `production_total_2025`) ; la clé sans
 * suffixe garde l'année de sa période de référence. Un nom de clé différent pour la même notion se déclare ici (clé du millésime → clé de base).
 */
export const ELECTRICITY_ALIASES: Record<string, string> = { consumption_corrected: "consumption" };

/**
 * Séries automatiques de la Banque mondiale (scripts/sync-approche-worldbank.ts) : leurs clés sont réservées, une fiche saisie ne peut
 * pas les porter (une clé = une valeur, aucune couche n'en écrase une autre). `topic` est celui des séries : une mesure saisie du même
 * sujet le reprend pour s'ouvrir dans le volet « Autres sources » de la tuile. Un test vérifie cette liste contre le script.
 */
export const AUTOMATIC_SERIES: readonly { key: string; topic: string }[] = [
  { key: "demography.population", topic: "population" },
  { key: "economy.gdp_nominal_usd", topic: "gdp" },
  { key: "economy.gdp_per_capita_usd", topic: "gdp_per_capita" },
  { key: "economy.gdp_growth", topic: "growth" },
  { key: "economy.inflation_cpi", topic: "inflation" },
  { key: "labour.unemployment_ilo", topic: "unemployment" },
  { key: "geography.surface_area", topic: "area" },
  { key: "research.rd_gdp", topic: "rd" },
];

/** Préfixes de clés saisies qui désignent le même sujet qu'une série automatique (pour suggérer le `topic` à l'import). */
export const TOPIC_HINTS: readonly { prefix: string; topic: string; tile: string }[] = [
  { prefix: "demography.population", topic: "population", tile: "Population" },
  { prefix: "economy.gdp_nominal", topic: "gdp", tile: "PIB nominal" },
  { prefix: "economy.gdp_per_capita", topic: "gdp_per_capita", tile: "PIB par habitant" },
  { prefix: "economy.gdp_growth", topic: "growth", tile: "Croissance du PIB réel" },
  { prefix: "economy.growth", topic: "growth", tile: "Croissance du PIB réel" },
  { prefix: "economy.inflation", topic: "inflation", tile: "Inflation (IPC)" },
  { prefix: "labour.unemployment", topic: "unemployment", tile: "Chômage" },
  { prefix: "geography.surface_area", topic: "area", tile: "Superficie" },
  { prefix: "geography.area", topic: "area", tile: "Superficie" },
  { prefix: "research.rd", topic: "rd", tile: "Dépenses de R&D" },
];
