// Familles de clés d'observations lues par l'interface : une clé par branche économique, une par filière d'électricité. Partagé par
// l'onglet Économie et par le rapport du contrat de données (docs/APPROCHE_CHAMPS_UI.md).

/** Branches de la nomenclature d'activités A10 (NACE rév. 2) : `economy.value_added.<code>` et `economy.value_added_share.<code>`. */
export const VALUE_ADDED_BRANCHES = ["A", "B-E", "F", "G-I", "J", "K", "L", "M_N", "O-Q", "R-U"] as const;

/** Mesures d'électricité : `energy.electricity.<clé>`. Seule `production_total` est indispensable au graphique de production. */
export const ELECTRICITY_KEYS = ["production_total", "nuclear", "renewable", "hydro", "wind_solar", "solar", "fossil", "exports_gross", "imports", "net_exports", "consumption"] as const;
