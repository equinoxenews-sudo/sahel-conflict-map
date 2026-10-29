# Contrat de données « Approche » — paquet pour ChatGPT (schéma version 1)

**À remettre à ChatGPT** pour produire des fiches pays complètes, sourcées et directement intégrables. Les fichiers ci-dessous décrivent **exactement** ce que l'interface lit : aucun champ n'est inventé, aucune structure n'est parallèle. Version du contrat : **1** (fiche France validée comme gabarit, pays pilotes suivants : Mali, Chine).

## 1. Le contrat en une page

- **Un fichier par pays** : `data/approche/<ISO3>.json` (ex. `MLI.json`), `"schemaVersion": 1`. Un seul moteur : aucune page, aucun composant n'est écrit par pays.
- **Livrer en `draft` ou `review`.** Le passage à `published` se décide après relecture, avec l'accord du responsable éditorial.
- **Tout est sourcé.** Chaque valeur, phrase, relation et élément de module cite au moins une source du registre `sources[]` (adresse exacte, organisme, date de consultation, licence). Une valeur sans source est refusée.
- **Une valeur absente reste absente** : `value: null` et `status: "pending"` ; jamais d'estimation, jamais de valeur « plausible ».
- **Modules optionnels** : un pays fournit les modules dont il dispose (`hero`, `media`, `overview`, `relations`, `economy`, `defense`, `issues`, `outlook`). Ce qui n'existe pas est masqué ou affiché « Donnée non disponible » ; on ne fabrique rien pour remplir une rubrique.
- **Exclusions** : SIPRI (et tout relais de SIPRI) tant qu'aucune autorisation commerciale écrite n'existe ; aucun contenu de démonstration (`demo: true`) ; aucune image sans licence commerciale confirmée ; aucun score d'influence, de risque ou de probabilité sans méthode publiée.

> Valider un fichier prouve sa **forme**, ses **liens internes** et ses **règles de traçabilité**. Cela ne prouve pas que son contenu est **vrai** : c'est le rôle de la relecture.

## 2. Les fichiers du paquet et leur usage

| Fichier | Usage | Nature |
|---|---|---|
| `docs/APPROCHE_CONTRAT_V1.md` | Ce document : vue d'ensemble, commandes, étapes. | rédigé |
| `docs/APPROCHE_SCHEMA_V1.md` | Règles de fond, structure des fichiers, modules, cartes, sources, versions et migration. **À lire en premier.** | rédigé |
| `docs/APPROCHE_CHAMPS_V1.md` | Dictionnaire champ par champ : chemin, type, obligatoire ou facultatif, défaut, contraintes, sens. | **généré** |
| `docs/approche.schema.v1.json` | JSON Schema machine (descriptions de champs incluses) : à charger dans un outil de génération ou de contrôle. | **généré** |
| `docs/APPROCHE_CHAMPS_UI.md` | Clés d'observations que les composants lisent réellement, familles de clés, règles d'affichage des données absentes. | **généré** |
| `docs/exemples/APPROCHE_EXEMPLE_COMPLET.json` | Pays **fictif** avec tous les modules et tous les types de champs. Modèle de structure. | exemple |
| `docs/exemples/APPROCHE_EXEMPLE.json` | Pays **fictif partiel** : identité, sources, quelques observations, une relation, deux modules. Modèle d'une livraison minimale. | exemple |
| `tests/fixtures/approche-invalide-structure.json` | Fichier **volontairement faux** (erreurs de structure). | contre-exemple |
| `tests/fixtures/approche-invalide-publication.json` | Fichier **volontairement faux** (règles de publication : SIPRI, source inconnue, démo, liens cassés). | contre-exemple |
| `docs/POLITIQUE_LICENCES_SOURCES.md` | Politique de licences, SIPRI et ses relais, état d'application dans le code. | rédigé |
| `docs/APPROCHE_GUIDE_PAYS.md` | Ajouter un pays, modifier un champ, lire les erreurs, aller jusqu'à la preview. | rédigé |
| `docs/APPROCHE_UI_ET_MEDIAS.md` | Choix d'interface, règles des médias (licence, repli neutre, garde-fou de production). | rédigé |
| `data/approche/FRA.json` | Fiche **réelle** de référence (France), à lire comme modèle de rigueur. | données |

Les trois fichiers **générés** sont produits par le code : un test échoue s'ils ne sont plus à jour. Ils ne se modifient jamais à la main (`npm run approche:contract`).

## 3. Commande de validation

À exécuter sur chaque JSON produit, avant toute remise :

```bash
npm run approche:validate -- data/approche/MLI.json
```

Avec test de chaque adresse de source (réseau nécessaire, quelques minutes) :

```bash
npm run approche:validate -- data/approche/MLI.json --check-links
```

Plusieurs fichiers d'un coup : `npm run approche:validate -- data/approche/MLI.json data/approche/CHN.json`.

**Ce que la commande contrôle**

1. **Structure** (Zod) : champs obligatoires, types, dates `AAAA-MM-JJ`, adresses complètes, valeurs permises, `schemaVersion`.
2. **Publication** : chaque valeur, affirmation, relation et élément de module a au moins une source connue ; aucune source exclue (SIPRI, y compris relayée : `originalPublisher`) ; aucune observation « verified » sans date de vérification ou sans valeur ; aucun `demo: true` ; aucune image sans licence commerciale confirmée.
3. **Références** : toute `sourceIds` mène à une source ; tout `observationKey` à une observation ; tout `imageId` à une image du catalogue ; tout `parentId` à un nœud ; toute opération reliée à un objet de carte existant ; pas d'identifiant en double.

**Résultat** : code de sortie `0` et ligne `✔ … valide (…)` si tout est bon ; code `1` et la liste des problèmes sinon. Les lignes `!` sont des **avertissements** (licence « unknown » à vérifier, lien injoignable) : à traiter avant publication, sans bloquer la validation.

Exemple d'erreurs de structure (`tests/fixtures/approche-invalide-structure.json`) :

```text
✖ tests/fixtures/approche-invalide-structure.json : structure invalide
   - countryCode : exactement 3 caractères attendus
   - sources.0.canonicalUrl : adresse invalide (adresse complète https://… attendue)
   - sources.0.accessedAt : date AAAA-MM-JJ attendue
   - observations.0.referencePeriod : champ obligatoire absent
   - observations.0.sourceIds : au moins 1 élément(s) attendu(s)
   - observations.0.status : valeur non reconnue, attendu : "verified"|"pending"|"stale"|"conflicting"|"rejected"
   - relationships.0.relationType : valeur non reconnue, attendu : "treaty"|"cooperation"|"tension"
```

Exemple d'erreurs de publication (`tests/fixtures/approche-invalide-publication.json`) :

```text
✖ tests/fixtures/approche-invalide-publication.json : 7 problème(s) de publication
   - source exclue (licence) : S-AGG
   - observation xxx-population-2025 : « verified » sans date de vérification
   - observation xxx-defense-budget-2025 : source exclue S-AGG
   - affirmation xxx-claim-1 : source inconnue S-INCONNUE
   - modules.defense.kpis[0] : contenu de démonstration dans une fiche réelle
   - modules.defense.kpis[0] : observation inconnue « defense.inconnue » (observationKey)
   - modules.defense.organization « org-2 » : parent inconnu « org-absent »
```

## 4. Ce qui reste du côté de Claude (intégration)

ChatGPT livre le JSON ; Claude **valide techniquement et intègre sans réécrire les données** :

1. `npm run approche:validate` sur le fichier reçu ; renvoi des erreurs à ChatGPT si besoin.
2. Enregistrement du pays dans le registre `lib/approche/repository.ts` (deux lignes), contrôle du rendu local et de la preview Vercel.
3. Les valeurs `pending` restent `pending` : elles ne sont jamais publiées comme vérifiées.
4. Aucun passage en production, aucune fusion sur `main` sans l'accord du responsable.

## 5. Pays pilotes

| Pays | Orientation | Ce que le test doit prouver |
|---|---|---|
| France | Complet (référence) | Gabarit de rigueur : sources par donnée, deux sources comparées, relations datées. |
| Mali | Sécurité et conflits | Modules `defense`, `issues`, `outlook` ; cartes d'engagements ; peu de données statistiques (valeurs `pending`). |
| Chine | Économie, industrie, défense | Modules `economy`, `defense` ; séries chiffrées ; sources de licences variées. |

Le moteur a été éprouvé sur le fichier d'exemple complet et sur l'exemple partiel : les six onglets s'affichent dans les deux cas, sans rien de spécifique à la France (voir `docs/APPROCHE_CHAMPS_UI.md`).

## 6. Politique de version

Voir `docs/APPROCHE_SCHEMA_V1.md`, section « Versions et migration » : les évolutions du schéma 1 sont **additives** (nouveaux champs ou modules facultatifs) ; un fichier v1 reste valide. Toute évolution non additive crée un schéma 2 avec un script de migration et une période de lecture des deux versions.
