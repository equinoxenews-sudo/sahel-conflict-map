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
