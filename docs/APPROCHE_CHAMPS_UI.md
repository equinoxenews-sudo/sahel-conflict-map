# Ce que l'interface lit — clés d'observations et modules

> Fichier **généré** par `npm run approche:contract` (analyse du code des composants). Un test échoue s'il n'est plus à jour.

## Principe

- Aucun composant n'est écrit pour un pays : tout texte, chiffre, unité, période et source vient du fichier du pays. Un test interdit les noms de pays, d'institutions ou de personnes dans les composants communs.
- Une donnée absente du fichier est **masquée** (appartenance, section d'énergie, structure économique…) ou affichée « Donnée non disponible » (tuiles de chiffres clés) : jamais complétée.
- Les **modules** (`modules.hero`, `media`, `overview`, `relations`, `economy`, `defense`, `issues`, `outlook`) sont lus champ par champ comme décrit dans `APPROCHE_CHAMPS_V1.md` : chaque champ du schéma est consommé par l'interface.

## Clés d'observations lues par les composants

Une clé absente du fichier n'est pas une erreur. Une clé nouvelle est acceptée ; elle ne s'affiche que si un composant ou un module (`observationKey`) la référence. Les clés avec `${…}` ou `*` sont des familles (une clé par branche économique, par filière…).

| Clé | Lue par |
|---|---|
| `demography.density` | OverviewTab.tsx |
| `demography.population` | OverviewTab.tsx |
| `economy.gdp_growth` | EconomyTab.tsx, OverviewTab.tsx |
| `economy.gdp_nominal_usd` | EconomyTab.tsx, OverviewTab.tsx |
| `economy.gdp_per_capita_usd` | EconomyTab.tsx, OverviewTab.tsx |
| `economy.inflation_cpi` | EconomyTab.tsx, OverviewTab.tsx |
| `economy.public_debt_gdp` | EconomyTab.tsx, OverviewTab.tsx |
| `economy.value_added_share.${code}` | EconomyTab.tsx |
| `economy.value_added.${code}` | EconomyTab.tsx |
| `economy.value_added.total` | EconomyTab.tsx |
| `energy.electricity.${key}` | EconomyTab.tsx |
| `energy.electricity.consumption` | EconomyTab.tsx |
| `energy.electricity.exports_gross` | EconomyTab.tsx |
| `energy.electricity.imports` | EconomyTab.tsx |
| `energy.electricity.net_exports` | EconomyTab.tsx |
| `energy.electricity.production_total` | EconomyTab.tsx |
| `energy.import_dependency` | EconomyTab.tsx |
| `geography.area` | OverviewTab.tsx |
| `identity.capital` | OverviewTab.tsx |
| `identity.currency` | OverviewTab.tsx |
| `identity.language` | OverviewTab.tsx |
| `institutions.eec_founding` | RelationsTab.tsx |
| `institutions.eu_membership` | Hero.tsx, OverviewTab.tsx, RelationsTab.tsx |
| `institutions.euro_area` | OverviewTab.tsx, RelationsTab.tsx |
| `institutions.g20` | Hero.tsx, RelationsTab.tsx |
| `institutions.g7` | Hero.tsx, RelationsTab.tsx |
| `institutions.nato` | Hero.tsx, OverviewTab.tsx, RelationsTab.tsx |
| `institutions.oecd` | Hero.tsx, RelationsTab.tsx |
| `institutions.oif` | Hero.tsx, RelationsTab.tsx |
| `institutions.schengen` | OverviewTab.tsx, RelationsTab.tsx |
| `institutions.unsc` | Hero.tsx, OverviewTab.tsx, RelationsTab.tsx |
| `labour.unemployment_ilo` | EconomyTab.tsx, OverviewTab.tsx |
| `politics.head_of_government` | OverviewTab.tsx |
| `politics.head_of_state` | OverviewTab.tsx |
| `politics.regime` | OverviewTab.tsx |
| `research.rd_gdp` | OverviewTab.tsx |

`geography.area` désigne la première mesure `geography.area.<source>` du fichier (ex. `geography.area.eurostat`).

## Familles de clés

- `economy.value_added.<code>` (montant) et `economy.value_added_share.<code>` (part calculée) : codes de branche `A`, `B-E`, `F`, `G-I`, `J`, `K`, `L`, `M_N`, `O-Q`, `R-U` (nomenclature A10), plus `economy.value_added.total`. Le graphique de structure de l'économie n'apparaît que si une branche a son montant **et** sa part, avec le total.
- `energy.electricity.<clé>` : `production_total`, `nuclear`, `renewable`, `hydro`, `wind_solar`, `solar`, `fossil`, `exports_gross`, `imports`, `net_exports`, `consumption`. La section « électricité » n'apparaît que si au moins une de ces mesures existe ; le graphique de production exige `production_total`. Une filière absente n'est jamais comptée comme nulle : elle tombe dans « non détaillé (calculé) ».
- `institutions.*` : une ligne d'appartenance n'est affichée que si le fichier la documente (ou la signale `pending`). **Ne pas créer** d'observation pour une organisation dont le pays n'est pas membre : une observation `institutions.*` produit un badge d'appartenance.
- `demography.density` : si présente, remplace la ligne « densité non calculée » de la vue d'ensemble.

## Libellés

Les libellés des tuiles (« Population », « PIB nominal »…) sont ceux de l'interface, communs à tous les pays. Pour un sujet propre à un pays, utiliser une observation avec `label` et la référencer par `observationKey` dans un chiffre clé de module.
