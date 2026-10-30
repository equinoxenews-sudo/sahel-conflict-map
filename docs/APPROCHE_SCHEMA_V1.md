# Schéma des fiches pays « Approche » — version 1

Ce document s'adresse à qui produit les fichiers de données (ChatGPT, éditeur humain) : il suffit de le suivre, sans connaître le code. Un fichier conforme s'affiche tel quel dans le moteur de fiches.

- **Un fichier par pays** : `data/approche/<ISO3>.json` (ex. `FRA.json`). Le moteur est unique : aucune page n'est écrite par pays.
- **Paquet complet à remettre** : `docs/APPROCHE_CONTRAT_V1.md` (liste des fichiers, commande, étapes).
- **Schéma machine** : `docs/approche.schema.v1.json` (JSON Schema avec description de chaque champ) ; **dictionnaire champ par champ** : `docs/APPROCHE_CHAMPS_V1.md` ; **clés lues par l'interface** : `docs/APPROCHE_CHAMPS_UI.md`. Ces trois fichiers sont **générés** par `npm run approche:contract` à partir du code.
- **Exemples valides** : `docs/exemples/APPROCHE_EXEMPLE_COMPLET.json` (pays fictif, tous les modules) et `docs/exemples/APPROCHE_EXEMPLE.json` (pays fictif, livraison minimale).
- **Validation avant livraison** : `npm run approche:validate -- fichier.json` (ajouter `--check-links` pour tester que chaque adresse répond).
- **Version** : `"schemaVersion": 1`. Les évolutions futures sont **additives** (nouveaux champs ou modules optionnels) ; un fichier v1 reste lisible.

> Valider un fichier prouve sa **forme** et ses **règles de traçabilité**, pas l'**exactitude** de son contenu. Rien n'est publié comme « vérifié » sans relecture.

## 1. Règles de fond (non négociables)

1. **Une donnée = une définition** : unité, période, périmètre, méthode et au moins une source.
2. **Aucun nombre sans année** (`referencePeriod`). Aucun « aujourd'hui » sans date.
3. **Une valeur absente reste absente** : `value: null` et `status: "pending"`. Ne jamais compléter par une estimation.
4. **SIPRI est exclu**, ainsi que ses indicateurs relayés par d'autres plateformes (Banque mondiale `MS.MIL.XPND.*`, bases ouvertes, portails statistiques, médias de données), tant qu'aucune autorisation commerciale écrite n'existe. Les droits suivent la donnée d'origine, pas la plateforme qui la redistribue : toute source qui relaie les données d'un autre organisme renseigne `originalPublisher`, et un producteur d'origine exclu exclut la source. Tout fichier qui en contient est refusé. Dépenses militaires : utiliser les budgets publiés par le ministère national concerné, avec leur périmètre.
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
| `originalPublisher` | non, **mais obligatoire dès qu'une source relaie un autre organisme** | Producteur d'origine de la donnée (agrégateur, plateforme). Un producteur exclu (SIPRI) exclut la source. |
| `publishedAt` | non (recommandé) | Date de publication de la page, de la série ou du rapport (affichée dans la provenance). |
| `apiUrl`, `datasetId`, `datasetVersion`, `methodNotes`, `language` | non | Détails utiles à la réutilisation. |

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
| `history` | Valeurs des périodes précédentes (`[{ "period": "2024", "value": 1 }]`) pour les courbes ; même périmètre que la valeur. |
| `uncertainty` | Incertitude connue (révision, marge, estimation) : texte libre, affiché dans la provenance. |

Clés utilisées par l'interface (extensibles) : voir **`docs/APPROCHE_CHAMPS_UI.md`** (liste générée à partir du code, avec les familles `economy.value_added.<branche>` et `energy.electricity.<clé>`). Une clé nouvelle est acceptée ; elle s'affiche quand un module (`observationKey`) la référence.

**Règles propres aux clés `institutions.*`** : une observation `institutions.<organisation>` produit un **badge d'appartenance** dans l'en-tête. Ne la créer que si le pays **est membre** ; pour un pays non membre, ne rien écrire (ou une observation `pending` si le doute est à lever). Dissocier les événements historiques distincts (ex. `institutions.eec_founding` et `institutions.eu_membership`, deux dates, deux sources).

### 2.3 `claims[]` (phrases factuelles ou analytiques)

`id`, `statement`, `claimType` (`fact`, `attributed_position`, `analysis`, `scenario`), `sourceIds` (≥ 1), `validAsOf`, `status` (`verified`, `pending`, `stale`, `contested`), `caveats[]`. Les affirmations vérifiées composent l'introduction de la fiche.

### 2.4 `relationships[]`

`id`, `targetCode`, `targetIso2` (drapeau), `targetName`, `relationType` (`treaty`, `cooperation`, `tension`), `title`, `topics[]`, `summary`, `validFrom`, `validTo`, `sourceIds` (≥ 1), `lastReviewedAt`, `status`. Une divergence n'est publiée qu'avec un fait daté et sa source.

## 3. Modules optionnels (`modules`)

Un pays peut ne fournir **aucun** module, quelques-uns ou tous : l'interface affiche ce qui existe et masque le reste.

Chaque élément identifiable (`id`) d'un module réel porte `sourceIds` (≥ 1), sauf s'il renvoie à une observation sourcée (`observationKey`).

**Élément éditorial (`Item`)** : `id`, `title`, `summary`, `tags[]`, `date`, `status` (calendrier : `prévu`, `annoncé`, `réalisé`), `url`, `imageId` (image du catalogue `modules.media`), `sourceIds`. Les `id` d'éléments sont **uniques dans toute la fiche**.

**Chiffre clé (`Kpi`)** : `id`, `label`, soit `observationKey` (valeur sourcée de `observations`), soit `valueText` + `unit` + `period` + `sourceIds`.

| Module | Contenu |
|---|---|
| `hero` | `imageId` (image d'en-tête), `tagline` (phrase de positionnement), `summary` (synthèse courte, sinon l'interface assemble les affirmations vérifiées), `bannerImages` (image d'ouverture par onglet : `relations`, `economy`, `defense`, `issues`, `outlook`). |
| `media` | `assets[]` : catalogue des images (voir §3.2). Sans image autorisée, l'interface affiche un visuel neutre : **ne rien inventer**. |
| `overview` | `strengths[]`, `challenges[]`, `timeline[]` — appréciations analytiques sourcées, jamais de barres de « puissance ». |
| `relations` | `map` — carte du réseau diplomatique (postes institutionnels : ambassades, consulats, représentations ; seulement si l'annuaire est réutilisable) ; `presenceMap` — présences et engagements documentés (accords, missions, implantations publiques, territoires), **jamais** une zone d'influence. |
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

- `theme` : `defense`, `economy`, `relations`, `interests`, `risks`, `infrastructure` (catégorie de la couche ; `color` est celle de la légende, `#rrggbb`).
- **Identifiants stables** : `id` de couche unique dans la carte, `id` d'objet unique dans la couche ; ils ne changent pas d'une mise à jour à l'autre (les opérations de défense s'y réfèrent par `layerId` / `featureId`).
- **Coordonnées** : degrés décimaux **WGS84** (`lat` −90 à 90, `lon` −180 à 180), à la précision de l'information **publique**. Aucune coordonnée sensible, opérationnelle non publique ou spéculative.
- **Provenance et validité** : chaque couche porte `attribution`, `license`, `sourceUrl` (jeu de données) et `lastUpdatedAt` ; chaque objet porte `sourceIds`, `status` (« Actif », « Clôturé »… : une opération terminée n'est jamais présentée comme en cours) et `url` officielle si elle existe.
- **Filtres** : les couches sont **sélectionnables** dans l'interface (un bouton par couche, avec décompte) ; chaque objet ouvre sa fiche (source, statut, coordonnées). Les filtres sont donc les couches : une catégorie à filtrer = une couche.
- **GeoJSON** : non pris en charge dans la version 1 (points seulement). Les polygones et couches surfaciques officielles (ex. aléas) viendront dans une évolution **additive** du schéma, avec leur licence ; ne pas les simuler par des points.
- Points uniquement dans la version 1. **Aucun tracé de canalisation ou de réseau inventé** : seulement des jeux de données publics sous licence et géométrie vérifiée. Aucune coordonnée sensible ou spéculative.
- Une carte de risques (cyber, social, terrorisme) « peinte » par département n'est pas acceptée : seules des couches documentées (ex. Géorisques) avec leur légende officielle.

### 3.2 Images (`modules.media.assets[]`)

Une image n'apparaît en production que si **sa licence est lue ET autorise expressément la réutilisation commerciale**. Aucune photographie n'est libre parce qu'elle figure sur Wikimédia, un ministère ou le site d'un industriel : vérifier fichier par fichier (licence, auteur, marques, usage commercial).

| Champ | Contenu |
|---|---|
| `id`, `path`, `alt`, `subject` | Identifiant, chemin sous `/public` (ex. `/approche/mli/hero.webp`), description factuelle, sujet. Un lieu n'est nommé que s'il est **identifié** : un terminal générique n'est jamais « le port de … ». |
| `author`, `credit`, `sourceUrl` | Auteur, légende de crédit, adresse d'origine. |
| `license`, `licenseUrl` | Licence lue et adresse de ses conditions. |
| `licenseStatus` | `cleared` (licence lue, usage commercial permis), `to_confirm`, `unknown`. Seule `cleared` est publiable. |
| `commercialReuseAllowed` | `true` **seulement** si la licence l'autorise expressément. Sans cela, l'image est refusée en production. |
| `attributionRequired`, `obligations`, `reviewedAt` | Attribution imposée, texte d'obligation, date de vérification de la licence. |
| `focal` | Point d'intérêt (`x`, `y` en %) pour le recadrage sur mobile. |

Un fichier **réel** qui cite une image non `cleared` ou sans `commercialReuseAllowed: true` est refusé ; un build de production échoue dans ce cas (`scripts/approche-media-guard.ts`). Un logo d'organisation n'est jamais ajouté sans autorisation : le badge texte suffit.

### 3.3 Références internes

Les liens entre éléments sont contrôlés : toute `sourceIds` mène à une source de `sources[]` ; `observationKey` à une observation ; `imageId` (élément, `hero.imageId`, `hero.bannerImages`) à une image de `media.assets` ; `parentId` d'un nœud de l'organigramme à un autre nœud (ou `null` pour la racine) ; `layerId` / `featureId` d'une opération à un objet de la carte de défense ; une dépendance `measured` porte une `observationKey`. Les `id` des éléments éditoriaux sont uniques dans la fiche. Une référence cassée est une erreur de publication.

## 4. Livraison et import

1. Produire `data/approche/<ISO3>.json` en `draft` ou `review`, conforme à ce document.
2. Lancer `npm run approche:validate -- data/approche/<ISO3>.json --check-links` et corriger les erreurs.
3. Les fichiers de séries automatiques (`<ISO3>.worldbank.json`, `<ISO3>.eurostat.json`) sont produits par `scripts/sync-approche-*.ts` ; ne pas les éditer à la main.
4. Le développeur vérifie le rendu, puis ajoute le pays au registre (`lib/approche/repository.ts`). Aucun composant à écrire.
5. Passage à `published` uniquement après relecture et accord du responsable éditorial.

## 5. Registre de sources : où trouver chaque exigence

| Exigence | Champ |
|---|---|
| Source exacte de chaque affirmation | `sourceIds` (au moins une) de chaque observation, affirmation, relation, élément de module ; `canonicalUrl` exacte de la source |
| Organisme | `sources[].publisher` (et `originalPublisher` si la source relaie un autre producteur) |
| Période mesurée | `observations[].referencePeriod` (+ `history` pour les périodes précédentes) |
| Date de publication | `sources[].publishedAt` |
| Date de vérification | `observations[].verifiedAt`, `relationships[].lastReviewedAt`, `sources[].accessedAt` (date de consultation) |
| Méthode | `observations[].methodology` (+ `calculationFormula` si calculée) ; `sources[].methodNotes` |
| Territoire / périmètre | `observations[].geographicScope` |
| Licence | `sources[].license`, `licenseUrl`, `reuse` |
| Statut d'approbation | `observations[].status` (`verified`, `pending`…), `claims[].status`, `relationships[].status` ; `publication` du fichier ; `claims[].reviewer` |
| Incertitude | `observations[].uncertainty` (+ `claims[].caveats`) |

## 6. Versions et migration

- **Version du fichier** : `"schemaVersion": 1`, **obligatoire** et vérifiée à la lecture. Une version inconnue est **refusée** (jamais lue de travers).
- **Évolutions additives** (version 1 conservée) : nouveau champ ou module **facultatif**, nouvelle valeur d'énumération qui n'invalide aucun fichier existant, nouvelle clé d'observation. Un fichier v1 déjà livré reste valide sans modification ; les fichiers générés (`approche.schema.v1.json`, dictionnaire, clés lues) sont régénérés et les tests les vérifient.
- **Évolutions non additives** (champ renommé ou supprimé, type modifié, champ devenu obligatoire) : création d'un **schéma 2**. Le moteur lit alors les deux versions pendant la période de migration ; un script de migration, écrit à ce moment-là, convertit les fichiers, la validation signale les fichiers non migrés, et la version 1 n'est retirée qu'après migration de tous les pays publiés.
- **Journal** : toute évolution du schéma est notée dans `docs/APPROCHE_SCHEMA_V1.md` (cette section) avec sa date. Historique : 29/10/2026 — v1 ; 30/10/2026 — ajouts facultatifs `uncertainty` (observation), `originalPublisher` (source), champs de licence des images, contrôle des références internes.

## 7. Données de démonstration

Le dossier `data/approche-demo/` contient du **contenu fictif** servant à valider l'interface. Il n'est chargé que si `NEXT_PUBLIC_APPROCHE_DEMO=1` (environnement Vercel « Preview » seulement) ; un build de production avec cette variable échoue ; une fiche réelle contenant un élément `demo: true` est refusée. Ne jamais copier du contenu de démonstration dans un fichier réel.
