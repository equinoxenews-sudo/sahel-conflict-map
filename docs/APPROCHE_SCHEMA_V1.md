# Schéma des fiches pays « Approche » — version 1

Ce document s'adresse à qui produit les fichiers de données (ChatGPT, éditeur humain) : il suffit de le suivre, sans connaître le code. Un fichier conforme s'affiche tel quel dans le moteur de fiches.

- **Un fichier par pays** : `data/approche/<ISO3>.json` (ex. `FRA.json`). Le moteur est unique : aucune page n'est écrite par pays.
- **Schéma machine** : `docs/approche.schema.v1.json` (JSON Schema, régénéré par `npm run approche:schema`).
- **Exemple complet et valide** : `docs/exemples/APPROCHE_EXEMPLE.json`.
- **Validation avant livraison** : `npm run approche:validate -- fichier.json` (ajouter `--check-links` pour tester que chaque adresse répond).
- **Version** : `"schemaVersion": 1`. Les évolutions futures sont **additives** (nouveaux champs ou modules optionnels) ; un fichier v1 reste lisible.

> Valider un fichier prouve sa **forme** et ses **règles de traçabilité**, pas l'**exactitude** de son contenu. Rien n'est publié comme « vérifié » sans relecture.

## 1. Règles de fond (non négociables)

1. **Une donnée = une définition** : unité, période, périmètre, méthode et au moins une source.
2. **Aucun nombre sans année** (`referencePeriod`). Aucun « aujourd'hui » sans date.
3. **Une valeur absente reste absente** : `value: null` et `status: "pending"`. Ne jamais compléter par une estimation.
4. **SIPRI est exclu**, ainsi que ses indicateurs relayés par d'autres plateformes (Banque mondiale `MS.MIL.XPND.*`), tant qu'aucune autorisation commerciale écrite n'existe. Tout fichier qui en contient est refusé.
5. **Licence contrôlée avant intégration** (`reuse`) : `allowed` (licence lue et compatible), `citation_only` (on cite un fait avec attribution, sans reprendre texte, image ni marque), `unknown` (non vérifiée : signalée à l'utilisateur), `commercial_license_required` (exclue).
6. **Pas de probabilités, scores ni barres d'influence** sans méthode publiée. Scénarios = récits (hypothèses, déclencheurs, signaux faibles), jamais de pourcentage.
7. **Relations bilatérales** : décrites par dimensions datées (traité, coopération, divergence), jamais en « amis / rivaux ».
8. **Opérations militaires** : toujours datées ; ne jamais présenter une opération close comme en cours.
9. **Dirigeants** : date et URL de la page officielle ; distinguer nomination du Premier ministre et composition du gouvernement.
10. **Deux mesures d'un même sujet** (ex. population Banque mondiale et Eurostat) : deux observations avec le même `topic`, jamais une moyenne.
11. **Contenu de démonstration interdit** : aucun élément `demo: true` dans un fichier réel.

## 2. Structure d'un fichier

```json
{
  "schemaVersion": 1,
  "countryCode": "FRA",
  "slug": "france",
  "zoneSlug": "europe",
  "name": "France",
  "officialName": "République française",
  "publication": "draft",
  "lastCheckedAt": "2026-10-29",
  "sources": [],
  "observations": [],
  "claims": [],
  "relationships": [],
  "modules": {}
}
```

| Champ | Rôle |
|---|---|
| `countryCode` | ISO 3166-1 alpha-3, en majuscules. |
| `slug`, `zoneSlug` | Doivent correspondre au pays et à la zone existants du site (ex. `france` / `europe`). |
| `publication` | `draft` → `review` → `published` → `archived`. Seul `published` est affiché publiquement. Livrer en `draft` ou `review`. |
| `lastCheckedAt` | Date du dernier contrôle de la fiche (AAAA-MM-JJ). |

### 2.1 `sources[]`

| Champ | Obligatoire | Contenu |
|---|---|---|
| `id` | oui | Identifiant unique, repris par `sourceIds`. |
| `publisher`, `title` | oui | Organisme et intitulé exact de la page, série ou rapport. |
| `canonicalUrl` | oui | **Adresse exacte** (pas la page d'accueil de l'organisme). |
| `accessedAt` | oui | Date de consultation. |
| `license`, `licenseUrl`, `reuse` | oui (`license` peut être `null`) | Licence lue, adresse de ses conditions, statut (voir §1.5). |
| `apiUrl`, `datasetId`, `datasetVersion`, `publishedAt`, `methodNotes`, `language` | non | Détails utiles à la réutilisation. |

### 2.2 `observations[]` (chiffres et faits localisés dans le temps)

| Champ | Contenu |
|---|---|
| `id`, `countryCode`, `key` | `key` stable, ex. `economy.gdp_nominal_usd`. |
| `label`, `topic` | Libellé d'affichage (facultatif) ; `topic` regroupe plusieurs mesures du même sujet. |
| `value`, `unit`, `currency` | Nombre, texte ou booléen ; unité (`habitants`, `USD`, `EUR`, `%`, `km²`, `TWh`…). `null` si inconnu. |
| `referencePeriod`, `validFrom` | Période de la valeur (`2025`, `2025-Q4`) ; début de validité d'un fait (prise de fonctions). |
| `geographicScope`, `methodology` | Périmètre et définition (obligatoires). |
| `sourceIds` | Au moins une source. |
| `collectedAt`, `verifiedAt` | Dates ; `verifiedAt` obligatoire si `status: "verified"`. |
| `status` | `verified`, `pending` (jamais affiché comme fait), `stale`, `conflicting`, `rejected`. |
| `dataKind` | `observed`, `calculated` (avec `calculationFormula`), `official_statement`, `editorial_analysis`. |
| `history` | Valeurs des périodes précédentes (`[{ "period": "2024", "value": 1 }]`) pour les courbes. |

Clés utilisées par l'interface (extensibles) : `identity.capital`, `identity.language`, `identity.currency`, `politics.regime`, `politics.head_of_state`, `politics.head_of_government`, `institutions.*` (eu_membership, euro_area, schengen, nato, unsc, g7, g20, oecd, oif), `demography.population`, `geography.area.*`, `economy.gdp_nominal_usd`, `economy.gdp_per_capita_usd`, `economy.gdp_growth`, `economy.inflation_cpi`, `economy.public_debt_gdp`, `labour.unemployment_ilo`, `research.rd_gdp`, `economy.value_added.<branche>` et `economy.value_added_share.<branche>`, `energy.electricity.*`, `energy.import_dependency`. Une clé nouvelle est acceptée ; elle s'affiche quand un module ou un composant la référence (`observationKey`).

### 2.3 `claims[]` (phrases factuelles ou analytiques)

`id`, `statement`, `claimType` (`fact`, `attributed_position`, `analysis`, `scenario`), `sourceIds` (≥ 1), `validAsOf`, `status` (`verified`, `pending`, `stale`, `contested`), `caveats[]`. Les affirmations vérifiées composent l'introduction de la fiche.

### 2.4 `relationships[]`

`id`, `targetCode`, `targetIso2` (drapeau), `targetName`, `relationType` (`treaty`, `cooperation`, `tension`), `title`, `topics[]`, `summary`, `validFrom`, `validTo`, `sourceIds` (≥ 1), `lastReviewedAt`, `status`. Une divergence n'est publiée qu'avec un fait daté et sa source.

## 3. Modules optionnels (`modules`)

Un pays peut ne fournir **aucun** module, quelques-uns ou tous : l'interface affiche ce qui existe et masque le reste.

Chaque élément identifiable (`id`) d'un module réel porte `sourceIds` (≥ 1), sauf s'il renvoie à une observation sourcée (`observationKey`).

**Élément éditorial (`Item`)** : `id`, `title`, `summary`, `tags[]`, `date`, `status` (calendrier : `prévu`, `annoncé`, `réalisé`), `url`, `sourceIds`.

**Chiffre clé (`Kpi`)** : `id`, `label`, soit `observationKey` (valeur sourcée de `observations`), soit `valueText` + `unit` + `period` + `sourceIds`.

| Module | Contenu |
|---|---|
| `overview` | `strengths[]`, `challenges[]`, `timeline[]` — appréciations analytiques sourcées, jamais de barres de « puissance ». |
| `relations` | `map` — carte du réseau diplomatique (seulement si l'annuaire est réutilisable). |
| `economy` | `sectors[]`, `resources[]`, `map` (ports, énergie… couches documentées). |
| `defense` | `kpis[]`, `organization[]` (`id`, `label`, `parentId`), `missions[]`, `framework[]`, `operations[]` (`layerId`/`featureId` pour la carte), `equipment[]` (`category`, `inServiceText` daté), `industry[]`, `partnerships[]`, `internalSecurity[]`, `threatPosture` (dispositif officiel : `system`, `level`, `validFrom`), `strengths[]`, `map`. |
| `issues` | `issues[]` (dossiers : `horizon`, `scope` parmi `national`/`european`/`international`, `subthemes`, `situation`, `whyStrategic`, `actors`, `indicators`, `uncertainties`), `calendar[]`, `opportunities[]`, `risks[]`, `kpis[]`, `map`. |
| `outlook` | `domains[]`, `dependencies[]` (`state`: `needs_methodology` ou `measured` avec `observationKey`), `swot` (`strengths`, `weaknesses`, `opportunities`, `threats`), `scenarios[]` (`kind`: `reinforcement`/`pressure`/`fragility`, `assumptions`, `triggers`, `weakSignals`, `consequences`, `limits`), `watchAxes[]`, `timeline[]`, `map`. |

### 3.1 Cartes (`map`)

```json
{
  "id": "implantations",
  "title": "Implantations publiques",
  "view": { "lat": 20, "lon": 20, "zoom": 2 },
  "layers": [
    {
      "id": "bases", "title": "Bases permanentes", "theme": "defense", "color": "#e0b44c",
      "attribution": "Organisme", "license": "…", "sourceUrl": "https://…", "lastUpdatedAt": "2026-01-01",
      "features": [
        { "id": "b1", "name": "Nom", "lat": 11.55, "lon": 43.15, "kind": "Base permanente",
          "summary": "…", "status": "Actif", "url": "https://…", "sourceIds": ["S1"] }
      ]
    }
  ]
}
```

- `theme` : `defense`, `economy`, `relations`, `interests`, `risks`, `infrastructure`.
- Les couches sont **sélectionnables** dans l'interface ; chaque objet ouvre sa fiche (source, statut, coordonnées).
- Points uniquement dans la version 1. **Aucun tracé de canalisation ou de réseau inventé** : seulement des jeux de données publics sous licence et géométrie vérifiée. Aucune coordonnée sensible ou spéculative.
- Une carte de risques (cyber, social, terrorisme) « peinte » par département n'est pas acceptée : seules des couches documentées (ex. Géorisques) avec leur légende officielle.

## 4. Livraison et import

1. Produire `data/approche/<ISO3>.json` en `draft` ou `review`, conforme à ce document.
2. Lancer `npm run approche:validate -- data/approche/<ISO3>.json --check-links` et corriger les erreurs.
3. Les fichiers de séries automatiques (`<ISO3>.worldbank.json`, `<ISO3>.eurostat.json`) sont produits par `scripts/sync-approche-*.ts` ; ne pas les éditer à la main.
4. Le développeur vérifie le rendu, puis ajoute le pays au registre (`lib/approche/repository.ts`). Aucun composant à écrire.
5. Passage à `published` uniquement après relecture et accord du responsable éditorial.

## 5. Données de démonstration

Le dossier `data/approche-demo/` contient du **contenu fictif** servant à valider l'interface. Il n'est chargé que si `NEXT_PUBLIC_APPROCHE_DEMO=1` (environnement Vercel « Preview » seulement) ; un build de production avec cette variable échoue ; une fiche réelle contenant un élément `demo: true` est refusée. Ne jamais copier du contenu de démonstration dans un fichier réel.
