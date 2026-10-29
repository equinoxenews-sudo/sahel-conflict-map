# Dictionnaire des champs — schéma version 1

> Fichier **généré** par `npm run approche:contract` à partir des schémas Zod que l'interface lit réellement. Ne pas l'éditer à la main : un test échoue s'il n'est plus à jour.

Les chemins notent `[]` pour une liste. « Obligatoire » = le champ doit figurer dans le fichier ; un champ facultatif absent prend son défaut. Une valeur absente reste absente : `null` avec `status: "pending"`, jamais une estimation. Quand une structure se répète (éléments éditoriaux, cartes), elle n'est détaillée qu'à sa première occurrence.

| Chemin | Type | Obligatoire | Défaut | Contraintes | Sens |
|---|---|---|---|---|---|
| `schemaVersion` | `1` | non | `1` |  | Version du schéma de fichier (1). Les évolutions sont additives : un fichier v1 reste lisible. |
| `countryCode` | texte | **oui** |  | exactement 3 caractères | Code ISO 3166-1 alpha-3 du pays, en majuscules (ex. FRA). |
| `slug` | texte | **oui** |  | non vide | Identifiant d'adresse du pays tel qu'il existe sur le site (ex. france). |
| `zoneSlug` | texte | **oui** |  | non vide | Zone du site à laquelle appartient le pays (ex. europe). |
| `name` | texte | **oui** |  | non vide | Nom d'usage du pays. |
| `officialName` | texte ou null | non |  |  | Nom officiel complet. |
| `publication` | `draft` · `review` · `published` · `archived` | **oui** |  |  | Cycle de vie : draft, review, published, archived. Seul « published » est affiché publiquement. |
| `lastCheckedAt` | date AAAA-MM-JJ ou null | **oui** |  |  | Date du dernier contrôle de la fiche (AAAA-MM-JJ), même sans changement. |
| `sources` | liste d'objets | **oui** |  |  | Registre des sources : chaque affirmation, observation, relation ou élément de module cite au moins une source de cette liste. |
| `sources[].id` | texte | **oui** |  | non vide | Identifiant unique de la source ; repris par les champs sourceIds. |
| `sources[].publisher` | texte | **oui** |  | non vide | Organisme qui publie la source. |
| `sources[].title` | texte | **oui** |  | non vide | Intitulé exact de la page, de la série ou du rapport. |
| `sources[].canonicalUrl` | adresse https:// | **oui** |  |  | Adresse exacte (jamais la page d'accueil de l'organisme). |
| `sources[].apiUrl` | adresse https:// ou null | non |  |  | Adresse de l'interface de données utilisée, le cas échéant. |
| `sources[].datasetId` | texte ou null | non |  |  | Code de la série ou du jeu de données (ex. NY.GDP.MKTP.CD). |
| `sources[].datasetVersion` | texte ou null | non |  |  | Version ou date de mise à jour du jeu de données. |
| `sources[].publishedAt` | texte ou null | non |  |  | Date de publication de la page, de la série ou du rapport. |
| `sources[].accessedAt` | date AAAA-MM-JJ | **oui** |  |  | Date de consultation par l'équipe (AAAA-MM-JJ). |
| `sources[].license` | texte ou null | **oui** |  |  | Licence lue sur la source ; null si aucune n'a été trouvée. |
| `sources[].licenseUrl` | adresse https:// ou null | non |  |  | Adresse des conditions d'utilisation ou de la licence. |
| `sources[].reuse` | `allowed` · `citation_only` · `unknown` · `commercial_license_required` | **oui** |  |  | Droit de réutilisation : allowed (licence lue et compatible), citation_only (un fait cité avec attribution, sans reprendre texte, image ni marque), unknown (non vérifiée, signalée), commercial_license_required (exclue, ex. SIPRI). |
| `sources[].methodNotes` | texte ou null | non |  |  | Ce qu'il faut savoir pour réutiliser la donnée : définition, révisions, limites. |
| `sources[].originalPublisher` | texte ou null | non |  |  | Organisme producteur d'origine quand la source relaie les données d'un autre (agrégateur, plateforme). Les droits suivent la donnée d'origine : un producteur exclu (SIPRI) exclut la source. |
| `sources[].language` | texte | non | `"fr"` |  | Langue de la source (fr, en…). |
| `observations` | liste d'objets | **oui** |  |  | Chiffres et faits localisés dans le temps : une valeur, son unité, sa période, son périmètre, sa méthode, ses sources. |
| `observations[].id` | texte | **oui** |  | non vide | Identifiant unique de l'observation. |
| `observations[].countryCode` | texte | **oui** |  | exactement 3 caractères | Code ISO alpha-3 du pays (identique à celui du fichier). |
| `observations[].key` | texte | **oui** |  | non vide | Clé stable de la donnée (ex. economy.gdp_nominal_usd). Les clés lues par l'interface sont listées dans APPROCHE_CHAMPS_UI.md ; une clé nouvelle est acceptée. |
| `observations[].label` | texte ou null | non |  |  | Libellé d'affichage quand la clé ne suffit pas (ex. nom d'une branche économique). |
| `observations[].topic` | texte ou null | non |  |  | Regroupe plusieurs mesures d'un même sujet (autre organisme, autre période) : elles sont affichées côte à côte, jamais moyennées. |
| `observations[].value` | nombre ou texte ou booléen ou null | **oui** |  |  | Valeur : nombre, texte ou booléen. null si inconnue (avec status pending). |
| `observations[].unit` | texte ou null | **oui** |  |  | Unité (habitants, USD, EUR, %, km², TWh…). null pour un texte. |
| `observations[].currency` | texte ou null | non |  |  | Devise quand la valeur est monétaire et que l'unité ne la porte pas. |
| `observations[].referencePeriod` | texte | **oui** |  | non vide | Période de la valeur (2025, 2025-Q4…). Jamais vide : aucun nombre sans année. |
| `observations[].geographicScope` | texte | **oui** |  | non vide | Périmètre géographique exact (pays entier, métropole seule…). |
| `observations[].methodology` | texte | **oui** |  | non vide | Définition et méthode : ce que mesure la valeur et comment. |
| `observations[].sourceIds` | liste de texte | **oui** |  | au moins 1 élément(s) | Identifiants des sources (au moins une). |
| `observations[].collectedAt` | date AAAA-MM-JJ | **oui** |  |  | Date de collecte (AAAA-MM-JJ). |
| `observations[].verifiedAt` | date AAAA-MM-JJ ou null | **oui** |  |  | Date de vérification humaine ; obligatoire si status = verified. |
| `observations[].validFrom` | texte ou null | non |  |  | Début de validité d'un fait (ex. prise de fonctions) quand la source le donne. |
| `observations[].status` | `verified` · `pending` · `stale` · `conflicting` · `rejected` | **oui** |  |  | verified (affichable), pending (jamais affichée comme un fait), stale, conflicting, rejected. |
| `observations[].dataKind` | `observed` · `calculated` · `official_statement` · `editorial_analysis` | **oui** |  |  | observed, calculated (avec calculationFormula), official_statement, editorial_analysis. |
| `observations[].calculationFormula` | texte ou null | non |  |  | Formule des valeurs calculées, en clés d'observations (ex. a / b). |
| `observations[].uncertainty` | texte ou null | non |  |  | Incertitude connue (révision, marge, estimation), affichée dans la provenance de la valeur. |
| `observations[].history` | liste d'objets | non | `[]` |  | Valeurs des périodes précédentes, de la plus ancienne à la plus récente (courbes). Même périmètre que la valeur. |
| `observations[].history[].period` | texte | **oui** |  |  | Période de la valeur. |
| `observations[].history[].value` | nombre | **oui** |  |  |  |
| `claims` | liste d'objets | non | `[]` |  | Phrases factuelles ou analytiques, sourcées. |
| `claims[].id` | texte | **oui** |  | non vide | Identifiant unique de l'affirmation. |
| `claims[].countryCode` | texte | **oui** |  | exactement 3 caractères | Code ISO 3166-1 alpha-3 du pays, en majuscules (ex. FRA). |
| `claims[].statement` | texte | **oui** |  | non vide | Phrase factuelle ou analytique. Les affirmations vérifiées composent l'introduction de la fiche. |
| `claims[].claimType` | `fact` · `attributed_position` · `analysis` · `scenario` | **oui** |  |  | fact, attributed_position, analysis, scenario. |
| `claims[].sourceIds` | liste de texte | **oui** |  | au moins 1 élément(s) | Sources de la phrase (au moins une). |
| `claims[].validAsOf` | texte | **oui** |  | non vide | Date à laquelle la phrase est valable. |
| `claims[].reviewer` | texte ou null | **oui** |  |  | Relecteur, null tant que la phrase n'est pas relue. |
| `claims[].status` | `verified` · `pending` · `stale` · `contested` | **oui** |  |  | verified, pending, stale, contested. |
| `claims[].caveats` | liste de texte | non | `[]` |  | Réserves et précisions sur la portée de la phrase. |
| `relationships` | liste d'objets | non | `[]` |  | Relations bilatérales ou avec des organisations, décrites par dimensions datées. |
| `relationships[].id` | texte | **oui** |  | non vide | Identifiant unique dans la fiche. |
| `relationships[].countryCode` | texte | **oui** |  | exactement 3 caractères | Code ISO 3166-1 alpha-3 du pays, en majuscules (ex. FRA). |
| `relationships[].targetCode` | texte ou null | **oui** |  |  | Code ISO alpha-3 de l'acteur visé ; null pour une organisation. |
| `relationships[].targetIso2` | texte ou null | non |  | exactement 2 caractères | Code ISO alpha-2 pour afficher le drapeau. |
| `relationships[].targetName` | texte | **oui** |  | non vide | Nom de l'acteur visé (pays ou organisation). |
| `relationships[].relationType` | `treaty` · `cooperation` · `tension` | **oui** |  |  | treaty (engagement conventionnel), cooperation (partenariat documenté), tension (divergence documentée). Jamais un classement ami / rival. |
| `relationships[].title` | texte | **oui** |  | non vide | Intitulé exact de l'accord, du traité ou du sujet de divergence. |
| `relationships[].topics` | liste de texte | non | `[]` |  | Domaines concernés (étiquettes). |
| `relationships[].summary` | texte | **oui** |  | non vide | Résumé factuel avec dates de signature et d'entrée en vigueur. |
| `relationships[].validFrom` | texte ou null | **oui** |  |  | Début de validité de la relation (AAAA-MM-JJ). |
| `relationships[].validTo` | texte ou null | non |  |  | Fin de validité, null si elle court encore. |
| `relationships[].sourceIds` | liste de texte | **oui** |  | au moins 1 élément(s) | Sources de l'élément (au moins une pour un élément réel, sauf s'il renvoie à une observation avec observationKey). |
| `relationships[].lastReviewedAt` | date AAAA-MM-JJ ou null | **oui** |  |  | Date de la dernière relecture ; obligatoire si status = verified. |
| `relationships[].status` | `verified` · `pending` · `stale` · `contested` | **oui** |  |  | verified, pending, stale, contested. |
| `modules` | objet | non | `{}` |  | Modules optionnels : un pays peut en fournir aucun, quelques-uns ou tous. L'interface affiche ce qui existe. |
| `modules.hero` | objet ou null | non |  |  | En-tête du pays : image, phrase de positionnement, résumé. |
| `modules.hero.imageId` | texte ou null | non |  |  | Identifiant d'une image de modules.media.assets. |
| `modules.hero.tagline` | texte ou null | non |  |  | Phrase de positionnement éditoriale, sans superlatif non sourcé. |
| `modules.hero.summary` | texte ou null | non |  |  | Résumé court ; à défaut, l'interface assemble les affirmations vérifiées. |
| `modules.hero.bannerImages` | dictionnaire texte → texte | non | `{}` |  | Image d'ouverture de chaque onglet (clés : relations, economy, defense, issues, outlook) : identifiants de modules.media.assets. |
| `modules.media` | objet ou null | non |  |  |  |
| `modules.media.assets` | liste d'objets | non | `[]` |  | Catalogue des images. Une image n'est publiable que si licenseStatus = cleared ET commercialReuseAllowed = true. |
| `modules.media.assets[].id` | texte | **oui** |  | non vide | Identifiant unique dans la fiche. |
| `modules.media.assets[].path` | texte | **oui** |  | non vide | Chemin sous /public (ex. /approche/<iso3>/hero.webp). |
| `modules.media.assets[].alt` | texte | **oui** |  | non vide | Description factuelle de l'image (accessibilité). |
| `modules.media.assets[].author` | texte ou null | non |  |  |  |
| `modules.media.assets[].credit` | texte ou null | non |  |  | Légende de crédit affichée sous l'image. |
| `modules.media.assets[].sourceUrl` | adresse https:// ou null | non |  |  |  |
| `modules.media.assets[].license` | texte ou null | non |  |  |  |
| `modules.media.assets[].licenseUrl` | adresse https:// ou null | non |  |  |  |
| `modules.media.assets[].licenseStatus` | `cleared` · `to_confirm` · `unknown` | non | `"unknown"` |  | cleared (licence lue, usage commercial permis), to_confirm ou unknown (affichées en démonstration seulement). |
| `modules.media.assets[].commercialReuseAllowed` | booléen ou null | non |  |  | true seulement si la licence autorise expressément la réutilisation commerciale. |
| `modules.media.assets[].attributionRequired` | booléen ou null | non |  |  | true si la licence impose une attribution. |
| `modules.media.assets[].obligations` | texte ou null | non |  |  | Obligations d'attribution à reprendre dans la légende. |
| `modules.media.assets[].reviewedAt` | texte ou null | non |  |  | Date de la vérification de la licence. |
| `modules.media.assets[].focal` | objet | non | `{"x":50,"y":50}` |  | Point d'intérêt (0 à 100 %) pour le recadrage sur mobile. |
| `modules.media.assets[].focal.x` | nombre | **oui** |  | ≥ 0, ≤ 100 |  |
| `modules.media.assets[].focal.y` | nombre | **oui** |  | ≥ 0, ≤ 100 |  |
| `modules.media.assets[].subject` | texte | non | `""` |  | Sujet de l'image (ex. nom du lieu). |
| `modules.overview` | objet ou null | non |  |  |  |
| `modules.overview.strengths` | liste d'objets | non | `[]` |  |  |
| `modules.overview.strengths[].id` | texte | **oui** |  | non vide | Identifiant unique dans la fiche. |
| `modules.overview.strengths[].title` | texte | **oui** |  | non vide | Titre affiché. |
| `modules.overview.strengths[].summary` | texte | non | `""` |  | Résumé factuel, daté et sourcé. |
| `modules.overview.strengths[].tags` | liste de texte | non | `[]` |  | Étiquettes courtes. |
| `modules.overview.strengths[].date` | texte ou null | non |  |  | Date ou année de l'élément (chronologie, calendrier). |
| `modules.overview.strengths[].status` | texte ou null | non |  |  | Statut libre ; pour un calendrier : prévu, annoncé, réalisé. |
| `modules.overview.strengths[].url` | adresse https:// ou null | non |  |  | Adresse de la page officielle de l'élément. |
| `modules.overview.strengths[].imageId` | texte ou null | non |  |  | Identifiant d'une image de modules.media.assets ; sans image, un visuel neutre est affiché. |
| `modules.overview.strengths[].sourceIds` | liste de texte | non | `[]` |  | Sources de l'élément (au moins une pour un élément réel, sauf s'il renvoie à une observation avec observationKey). |
| `modules.overview.strengths[].demo` | booléen | non | `false` |  | Réservé aux données de démonstration : un fichier réel contenant demo = true est refusé. |
| `modules.overview.challenges` | liste d'objets | non | `[]` |  |  |
| `modules.overview.challenges[].*` | _même structure que_ `modules.overview.strengths[]` | | | | Voir la première occurrence de cette structure. |
| `modules.overview.timeline` | liste d'objets | non | `[]` |  |  |
| `modules.overview.timeline[].*` | _même structure que_ `modules.overview.strengths[]` | | | | Voir la première occurrence de cette structure. |
| `modules.overview.territories` | objet ou null | non |  |  |  |
| `modules.overview.territories.id` | texte | **oui** |  | non vide | Identifiant unique dans la fiche. |
| `modules.overview.territories.title` | texte | **oui** |  | non vide | Titre affiché. |
| `modules.overview.territories.view` | objet | **oui** |  |  | Cadrage initial de la carte (centre et zoom). |
| `modules.overview.territories.view.lat` | nombre | **oui** |  |  | Latitude du centre initial de la carte (WGS84). |
| `modules.overview.territories.view.lon` | nombre | **oui** |  |  | Longitude du centre initial de la carte (WGS84). |
| `modules.overview.territories.view.zoom` | nombre | **oui** |  | ≥ 1, ≤ 14 | Niveau de zoom initial (1 à 14). |
| `modules.overview.territories.hub` | objet ou null | non |  |  | Point d'attache (ex. la capitale) relié à l'objet sélectionné. |
| `modules.overview.territories.hub.name` | texte | **oui** |  | non vide | Nom du point d'attache (ex. la capitale). |
| `modules.overview.territories.hub.lat` | nombre | **oui** |  | ≥ -90, ≤ 90 | Latitude du point d'attache (WGS84). |
| `modules.overview.territories.hub.lon` | nombre | **oui** |  | ≥ -180, ≤ 180 | Longitude du point d'attache (WGS84). |
| `modules.overview.territories.layers` | liste d'objets | **oui** |  |  | Couches sélectionnables de la carte. |
| `modules.overview.territories.layers[].id` | texte | **oui** |  | non vide | Identifiant stable de la couche (unique dans la carte). |
| `modules.overview.territories.layers[].title` | texte | **oui** |  | non vide | Titre affiché. |
| `modules.overview.territories.layers[].theme` | `defense` · `economy` · `relations` · `interests` · `risks` · `infrastructure` | **oui** |  |  | defense, economy, relations, interests, risks, infrastructure. |
| `modules.overview.territories.layers[].icon` | texte ou null | non |  |  | Pictogramme des marqueurs (nom du jeu lib/approche/icons.ts). |
| `modules.overview.territories.layers[].color` | couleur #rrggbb | **oui** |  |  | Couleur de la légende, hexadécimal #rrggbb. |
| `modules.overview.territories.layers[].description` | texte | non | `""` |  | Ce que contient la couche. |
| `modules.overview.territories.layers[].attribution` | texte | non | `""` |  | Mention d'attribution de la donnée. |
| `modules.overview.territories.layers[].license` | texte ou null | non |  |  | Licence du jeu de données. |
| `modules.overview.territories.layers[].sourceUrl` | adresse https:// ou null | non |  |  | Adresse du jeu de données. |
| `modules.overview.territories.layers[].lastUpdatedAt` | texte ou null | non |  |  | Date de dernière mise à jour du jeu de données. |
| `modules.overview.territories.layers[].features` | liste d'objets | **oui** |  |  | Objets de la couche (points WGS84). |
| `modules.overview.territories.layers[].features[].id` | texte | **oui** |  | non vide | Identifiant stable de l'objet (unique dans la couche). |
| `modules.overview.territories.layers[].features[].name` | texte | **oui** |  | non vide | Nom de l'objet. |
| `modules.overview.territories.layers[].features[].lat` | nombre | **oui** |  | ≥ -90, ≤ 90 | Latitude en degrés décimaux WGS84 (−90 à 90). |
| `modules.overview.territories.layers[].features[].lon` | nombre | **oui** |  | ≥ -180, ≤ 180 | Longitude en degrés décimaux WGS84 (−180 à 180). |
| `modules.overview.territories.layers[].features[].kind` | texte | **oui** |  | non vide | Nature : pour un scénario reinforcement, pressure ou fragility ; pour un objet de carte, sa nature (« Base permanente »). |
| `modules.overview.territories.layers[].features[].summary` | texte | non | `""` |  | Description publique et datée de l'objet. |
| `modules.overview.territories.layers[].features[].status` | texte ou null | non |  |  | Actif, Clôturé… : une opération terminée n'est jamais présentée comme en cours. |
| `modules.overview.territories.layers[].features[].url` | adresse https:// ou null | non |  |  | Adresse de la page officielle de l'élément. |
| `modules.overview.territories.layers[].features[].sourceIds` | liste de texte | non | `[]` |  | Sources de l'élément (au moins une pour un élément réel, sauf s'il renvoie à une observation avec observationKey). |
| `modules.overview.territories.layers[].features[].demo` | booléen | non | `false` |  | Réservé aux données de démonstration : un fichier réel contenant demo = true est refusé. |
| `modules.overview.territories.layers[].demo` | booléen | non | `false` |  | Réservé aux données de démonstration : un fichier réel contenant demo = true est refusé. |
| `modules.overview.territories.note` | texte | non | `""` |  | Note explicative courte. |
| `modules.relations` | objet ou null | non |  |  |  |
| `modules.relations.map` | objet ou null | non |  |  |  |
| `modules.relations.map.*` | _même structure que_ `modules.overview.territories` | | | | Voir la première occurrence de cette structure. |
| `modules.relations.presenceMap` | objet ou null | non |  |  |  |
| `modules.relations.presenceMap.*` | _même structure que_ `modules.overview.territories` | | | | Voir la première occurrence de cette structure. |
| `modules.economy` | objet ou null | non |  |  |  |
| `modules.economy.sectors` | liste d'objets | non | `[]` |  |  |
| `modules.economy.sectors[].*` | _même structure que_ `modules.overview.strengths[]` | | | | Voir la première occurrence de cette structure. |
| `modules.economy.resources` | liste d'objets | non | `[]` |  |  |
| `modules.economy.resources[].*` | _même structure que_ `modules.overview.strengths[]` | | | | Voir la première occurrence de cette structure. |
| `modules.economy.map` | objet ou null | non |  |  |  |
| `modules.economy.map.*` | _même structure que_ `modules.overview.territories` | | | | Voir la première occurrence de cette structure. |
| `modules.defense` | objet ou null | non |  |  |  |
| `modules.defense.kpis` | liste d'objets | non | `[]` |  |  |
| `modules.defense.kpis[].id` | texte | **oui** |  | non vide | Identifiant unique dans la fiche. |
| `modules.defense.kpis[].label` | texte | **oui** |  | non vide | Libellé affiché. |
| `modules.defense.kpis[].observationKey` | texte ou null | non |  |  | Clé d'une observation de la fiche : la valeur affichée vient d'elle. |
| `modules.defense.kpis[].valueText` | texte ou null | non |  |  | Valeur déclarée en texte, avec period, unit et sourceIds (si observationKey est absent). |
| `modules.defense.kpis[].unit` | texte ou null | non |  |  | Unité de la valeur. |
| `modules.defense.kpis[].period` | texte ou null | non |  |  | Période de la valeur. |
| `modules.defense.kpis[].note` | texte | non | `""` |  | Note explicative courte. |
| `modules.defense.kpis[].sourceIds` | liste de texte | non | `[]` |  | Sources de l'élément (au moins une pour un élément réel, sauf s'il renvoie à une observation avec observationKey). |
| `modules.defense.kpis[].demo` | booléen | non | `false` |  | Réservé aux données de démonstration : un fichier réel contenant demo = true est refusé. |
| `modules.defense.organization` | liste d'objets | non | `[]` |  |  |
| `modules.defense.organization[].id` | texte | **oui** |  | non vide | Identifiant unique dans la fiche. |
| `modules.defense.organization[].label` | texte | **oui** |  | non vide | Libellé affiché. |
| `modules.defense.organization[].parentId` | texte ou null | **oui** |  |  | Identifiant du nœud parent dans l'organigramme ; null pour la racine. Aucun lien hiérarchique sans source. |
| `modules.defense.organization[].note` | texte | non | `""` |  | Note explicative courte. |
| `modules.defense.organization[].sourceIds` | liste de texte | non | `[]` |  | Sources de l'élément (au moins une pour un élément réel, sauf s'il renvoie à une observation avec observationKey). |
| `modules.defense.organization[].demo` | booléen | non | `false` |  | Réservé aux données de démonstration : un fichier réel contenant demo = true est refusé. |
| `modules.defense.missions` | liste d'objets | non | `[]` |  |  |
| `modules.defense.missions[].*` | _même structure que_ `modules.overview.strengths[]` | | | | Voir la première occurrence de cette structure. |
| `modules.defense.framework` | liste d'objets | non | `[]` |  |  |
| `modules.defense.framework[].*` | _même structure que_ `modules.overview.strengths[]` | | | | Voir la première occurrence de cette structure. |
| `modules.defense.operations` | liste d'objets | non | `[]` |  |  |
| `modules.defense.operations[].id` | texte | **oui** |  | non vide | Identifiant unique dans la fiche. |
| `modules.defense.operations[].title` | texte | **oui** |  | non vide | Titre affiché. |
| `modules.defense.operations[].summary` | texte | non | `""` |  | Résumé factuel, daté et sourcé. |
| `modules.defense.operations[].tags` | liste de texte | non | `[]` |  | Étiquettes courtes. |
| `modules.defense.operations[].date` | texte ou null | non |  |  | Date ou année de l'élément (chronologie, calendrier). |
| `modules.defense.operations[].status` | texte ou null | non |  |  | Statut libre ; pour un calendrier : prévu, annoncé, réalisé. |
| `modules.defense.operations[].url` | adresse https:// ou null | non |  |  | Adresse de la page officielle de l'élément. |
| `modules.defense.operations[].imageId` | texte ou null | non |  |  | Identifiant d'une image de modules.media.assets ; sans image, un visuel neutre est affiché. |
| `modules.defense.operations[].sourceIds` | liste de texte | non | `[]` |  | Sources de l'élément (au moins une pour un élément réel, sauf s'il renvoie à une observation avec observationKey). |
| `modules.defense.operations[].demo` | booléen | non | `false` |  | Réservé aux données de démonstration : un fichier réel contenant demo = true est refusé. |
| `modules.defense.operations[].layerId` | texte ou null | non |  |  | Couche de la carte du module (id de couche). |
| `modules.defense.operations[].featureId` | texte ou null | non |  |  | Objet de la carte du module (id d'objet). |
| `modules.defense.equipment` | liste d'objets | non | `[]` |  |  |
| `modules.defense.equipment[].id` | texte | **oui** |  | non vide | Identifiant unique dans la fiche. |
| `modules.defense.equipment[].title` | texte | **oui** |  | non vide | Titre affiché. |
| `modules.defense.equipment[].summary` | texte | non | `""` |  | Résumé factuel, daté et sourcé. |
| `modules.defense.equipment[].tags` | liste de texte | non | `[]` |  | Étiquettes courtes. |
| `modules.defense.equipment[].date` | texte ou null | non |  |  | Date ou année de l'élément (chronologie, calendrier). |
| `modules.defense.equipment[].status` | texte ou null | non |  |  | Statut libre ; pour un calendrier : prévu, annoncé, réalisé. |
| `modules.defense.equipment[].url` | adresse https:// ou null | non |  |  | Adresse de la page officielle de l'élément. |
| `modules.defense.equipment[].imageId` | texte ou null | non |  |  | Identifiant d'une image de modules.media.assets ; sans image, un visuel neutre est affiché. |
| `modules.defense.equipment[].sourceIds` | liste de texte | non | `[]` |  | Sources de l'élément (au moins une pour un élément réel, sauf s'il renvoie à une observation avec observationKey). |
| `modules.defense.equipment[].demo` | booléen | non | `false` |  | Réservé aux données de démonstration : un fichier réel contenant demo = true est refusé. |
| `modules.defense.equipment[].category` | texte | non | `""` |  | Catégorie (ex. aviation de combat). |
| `modules.defense.equipment[].inServiceText` | texte ou null | non |  |  | Nombre en service à une date précise, seulement s'il est vérifié et daté. |
| `modules.defense.industry` | liste d'objets | non | `[]` |  |  |
| `modules.defense.industry[].*` | _même structure que_ `modules.overview.strengths[]` | | | | Voir la première occurrence de cette structure. |
| `modules.defense.partnerships` | liste d'objets | non | `[]` |  |  |
| `modules.defense.partnerships[].*` | _même structure que_ `modules.overview.strengths[]` | | | | Voir la première occurrence de cette structure. |
| `modules.defense.internalSecurity` | liste d'objets | non | `[]` |  |  |
| `modules.defense.internalSecurity[].*` | _même structure que_ `modules.overview.strengths[]` | | | | Voir la première occurrence de cette structure. |
| `modules.defense.threatPosture` | objet ou null | non |  |  | Dispositif officiel de vigilance : système, niveau, date de début, stades. |
| `modules.defense.threatPosture.system` | texte | **oui** |  | non vide | Dispositif officiel publié (jamais un niveau inventé). |
| `modules.defense.threatPosture.level` | texte | **oui** |  | non vide | Niveau ou stade en vigueur du dispositif officiel. |
| `modules.defense.threatPosture.validFrom` | texte ou null | non |  |  | Début de validité (AAAA-MM-JJ). |
| `modules.defense.threatPosture.stages` | liste de texte | non | `[]` |  | Stades du dispositif dans l'ordre. |
| `modules.defense.threatPosture.note` | texte | non | `""` |  | Note explicative courte. |
| `modules.defense.threatPosture.sourceIds` | liste de texte | non | `[]` |  | Sources de l'élément (au moins une pour un élément réel, sauf s'il renvoie à une observation avec observationKey). |
| `modules.defense.threatPosture.demo` | booléen | non | `false` |  | Réservé aux données de démonstration : un fichier réel contenant demo = true est refusé. |
| `modules.defense.strengths` | liste d'objets | non | `[]` |  |  |
| `modules.defense.strengths[].*` | _même structure que_ `modules.overview.strengths[]` | | | | Voir la première occurrence de cette structure. |
| `modules.defense.map` | objet ou null | non |  |  |  |
| `modules.defense.map.*` | _même structure que_ `modules.overview.territories` | | | | Voir la première occurrence de cette structure. |
| `modules.issues` | objet ou null | non |  |  |  |
| `modules.issues.issues` | liste d'objets | non | `[]` |  |  |
| `modules.issues.issues[].id` | texte | **oui** |  | non vide | Identifiant unique dans la fiche. |
| `modules.issues.issues[].title` | texte | **oui** |  | non vide | Titre affiché. |
| `modules.issues.issues[].summary` | texte | non | `""` |  | Résumé factuel, daté et sourcé. |
| `modules.issues.issues[].tags` | liste de texte | non | `[]` |  | Étiquettes courtes. |
| `modules.issues.issues[].date` | texte ou null | non |  |  | Date ou année de l'élément (chronologie, calendrier). |
| `modules.issues.issues[].status` | texte ou null | non |  |  | Statut libre ; pour un calendrier : prévu, annoncé, réalisé. |
| `modules.issues.issues[].url` | adresse https:// ou null | non |  |  | Adresse de la page officielle de l'élément. |
| `modules.issues.issues[].imageId` | texte ou null | non |  |  | Identifiant d'une image de modules.media.assets ; sans image, un visuel neutre est affiché. |
| `modules.issues.issues[].sourceIds` | liste de texte | non | `[]` |  | Sources de l'élément (au moins une pour un élément réel, sauf s'il renvoie à une observation avec observationKey). |
| `modules.issues.issues[].demo` | booléen | non | `false` |  | Réservé aux données de démonstration : un fichier réel contenant demo = true est refusé. |
| `modules.issues.issues[].horizon` | texte ou null | non |  |  | Horizon justifié (« 3–10 ans »). L'ordre des dossiers n'est pas un classement. |
| `modules.issues.issues[].scope` | liste de `national` · `european` · `international` | non | `[]` |  | Portée en étiquettes : national, european, international. Jamais en pourcentages. |
| `modules.issues.issues[].subthemes` | liste de texte | non | `[]` |  | Sous-thèmes du dossier. |
| `modules.issues.issues[].situation` | texte | non | `""` |  | Contexte et situation actuelle : faits sourcés et datés. |
| `modules.issues.issues[].whyStrategic` | texte | non | `""` |  | Analyse attribuée : pourquoi le dossier est stratégique. |
| `modules.issues.issues[].actors` | liste de texte | non | `[]` |  | Acteurs concernés. |
| `modules.issues.issues[].interests` | liste de texte | non | `[]` |  | Intérêts en jeu. |
| `modules.issues.issues[].recentDevelopments` | liste de texte | non | `[]` |  | Évolutions récentes datées. |
| `modules.issues.issues[].indicators` | liste de texte | non | `[]` |  | Indicateurs à surveiller. |
| `modules.issues.issues[].uncertainties` | liste de texte | non | `[]` |  | Hypothèses et incertitudes. |
| `modules.issues.issues[].updatedAt` | texte ou null | non |  |  | Date de dernière actualisation du dossier. |
| `modules.issues.calendar` | liste d'objets | non | `[]` |  |  |
| `modules.issues.calendar[].*` | _même structure que_ `modules.overview.strengths[]` | | | | Voir la première occurrence de cette structure. |
| `modules.issues.opportunities` | liste d'objets | non | `[]` |  |  |
| `modules.issues.opportunities[].*` | _même structure que_ `modules.overview.strengths[]` | | | | Voir la première occurrence de cette structure. |
| `modules.issues.risks` | liste d'objets | non | `[]` |  |  |
| `modules.issues.risks[].*` | _même structure que_ `modules.overview.strengths[]` | | | | Voir la première occurrence de cette structure. |
| `modules.issues.kpis` | liste d'objets | non | `[]` |  |  |
| `modules.issues.kpis[].*` | _même structure que_ `modules.defense.kpis[]` | | | | Voir la première occurrence de cette structure. |
| `modules.issues.map` | objet ou null | non |  |  |  |
| `modules.issues.map.*` | _même structure que_ `modules.overview.territories` | | | | Voir la première occurrence de cette structure. |
| `modules.outlook` | objet ou null | non |  |  |  |
| `modules.outlook.domains` | liste d'objets | non | `[]` |  |  |
| `modules.outlook.domains[].*` | _même structure que_ `modules.overview.strengths[]` | | | | Voir la première occurrence de cette structure. |
| `modules.outlook.dependencies` | liste d'objets | non | `[]` |  | Dépendances stratégiques : qualitatives tant qu'aucun numérateur, dénominateur, période, territoire et méthode ne sont publiés. |
| `modules.outlook.dependencies[].id` | texte | **oui** |  | non vide | Identifiant unique dans la fiche. |
| `modules.outlook.dependencies[].title` | texte | **oui** |  | non vide | Titre affiché. |
| `modules.outlook.dependencies[].summary` | texte | non | `""` |  | Résumé factuel, daté et sourcé. |
| `modules.outlook.dependencies[].tags` | liste de texte | non | `[]` |  | Étiquettes courtes. |
| `modules.outlook.dependencies[].date` | texte ou null | non |  |  | Date ou année de l'élément (chronologie, calendrier). |
| `modules.outlook.dependencies[].status` | texte ou null | non |  |  | Statut libre ; pour un calendrier : prévu, annoncé, réalisé. |
| `modules.outlook.dependencies[].url` | adresse https:// ou null | non |  |  | Adresse de la page officielle de l'élément. |
| `modules.outlook.dependencies[].imageId` | texte ou null | non |  |  | Identifiant d'une image de modules.media.assets ; sans image, un visuel neutre est affiché. |
| `modules.outlook.dependencies[].sourceIds` | liste de texte | non | `[]` |  | Sources de l'élément (au moins une pour un élément réel, sauf s'il renvoie à une observation avec observationKey). |
| `modules.outlook.dependencies[].demo` | booléen | non | `false` |  | Réservé aux données de démonstration : un fichier réel contenant demo = true est refusé. |
| `modules.outlook.dependencies[].state` | `needs_methodology` · `measured` | non | `"needs_methodology"` |  | needs_methodology (description qualitative, aucun pourcentage) ou measured (renvoie à observationKey). |
| `modules.outlook.dependencies[].observationKey` | texte ou null | non |  |  | Clé d'une observation de la fiche : la valeur affichée vient d'elle. |
| `modules.outlook.swot` | objet | non | `{"strengths":[],"weaknesses":[],"opportunities":[],"threats":[]}` |  | Forces, faiblesses, opportunités, menaces : appréciations attribuées, jamais de score. |
| `modules.outlook.swot.strengths` | liste d'objets | non | `[]` |  |  |
| `modules.outlook.swot.strengths[].*` | _même structure que_ `modules.overview.strengths[]` | | | | Voir la première occurrence de cette structure. |
| `modules.outlook.swot.weaknesses` | liste d'objets | non | `[]` |  |  |
| `modules.outlook.swot.weaknesses[].*` | _même structure que_ `modules.overview.strengths[]` | | | | Voir la première occurrence de cette structure. |
| `modules.outlook.swot.opportunities` | liste d'objets | non | `[]` |  |  |
| `modules.outlook.swot.opportunities[].*` | _même structure que_ `modules.overview.strengths[]` | | | | Voir la première occurrence de cette structure. |
| `modules.outlook.swot.threats` | liste d'objets | non | `[]` |  |  |
| `modules.outlook.swot.threats[].*` | _même structure que_ `modules.overview.strengths[]` | | | | Voir la première occurrence de cette structure. |
| `modules.outlook.scenarios` | liste d'objets | non | `[]` |  |  |
| `modules.outlook.scenarios[].id` | texte | **oui** |  | non vide | Identifiant unique dans la fiche. |
| `modules.outlook.scenarios[].title` | texte | **oui** |  | non vide | Titre affiché. |
| `modules.outlook.scenarios[].summary` | texte | non | `""` |  | Résumé factuel, daté et sourcé. |
| `modules.outlook.scenarios[].tags` | liste de texte | non | `[]` |  | Étiquettes courtes. |
| `modules.outlook.scenarios[].date` | texte ou null | non |  |  | Date ou année de l'élément (chronologie, calendrier). |
| `modules.outlook.scenarios[].status` | texte ou null | non |  |  | Statut libre ; pour un calendrier : prévu, annoncé, réalisé. |
| `modules.outlook.scenarios[].url` | adresse https:// ou null | non |  |  | Adresse de la page officielle de l'élément. |
| `modules.outlook.scenarios[].imageId` | texte ou null | non |  |  | Identifiant d'une image de modules.media.assets ; sans image, un visuel neutre est affiché. |
| `modules.outlook.scenarios[].sourceIds` | liste de texte | non | `[]` |  | Sources de l'élément (au moins une pour un élément réel, sauf s'il renvoie à une observation avec observationKey). |
| `modules.outlook.scenarios[].demo` | booléen | non | `false` |  | Réservé aux données de démonstration : un fichier réel contenant demo = true est refusé. |
| `modules.outlook.scenarios[].kind` | `reinforcement` · `pressure` · `fragility` | **oui** |  |  | Nature : pour un scénario reinforcement, pressure ou fragility ; pour un objet de carte, sa nature (« Base permanente »). |
| `modules.outlook.scenarios[].assumptions` | liste de texte | non | `[]` |  | Hypothèses du scénario. |
| `modules.outlook.scenarios[].triggers` | liste de texte | non | `[]` |  | Déclencheurs du scénario. |
| `modules.outlook.scenarios[].weakSignals` | liste de texte | non | `[]` |  | Signaux faibles à observer. |
| `modules.outlook.scenarios[].consequences` | liste de texte | non | `[]` |  | Conséquences possibles. |
| `modules.outlook.scenarios[].limits` | liste de texte | non | `[]` |  | Limites du scénario ; aucune probabilité chiffrée tant qu'aucun modèle n'est publié. |
| `modules.outlook.watchAxes` | liste d'objets | non | `[]` |  |  |
| `modules.outlook.watchAxes[].*` | _même structure que_ `modules.overview.strengths[]` | | | | Voir la première occurrence de cette structure. |
| `modules.outlook.timeline` | liste d'objets | non | `[]` |  |  |
| `modules.outlook.timeline[].*` | _même structure que_ `modules.overview.strengths[]` | | | | Voir la première occurrence de cette structure. |
| `modules.outlook.map` | objet ou null | non |  |  |  |
| `modules.outlook.map.*` | _même structure que_ `modules.overview.territories` | | | | Voir la première occurrence de cette structure. |
