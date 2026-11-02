# Importer un lot de fiches pays « Approche »

Architecture figée (02/11/2026) : ajouter un pays ne demande **aucune modification de composant ni de `repository.ts`**. Le fichier JSON du pays (schéma v1) est le seul changement ; le registre des pays est généré, les pages sont celles des composants existants, les observations nouvelles s'affichent par leur `label` et leur rubrique (`theme`, ou préfixe de clé).

## Procédure (5 à 10 pays à la fois)

1. **Déposer** les fichiers `<ISO3>.json` dans un dossier (hors dépôt). Chaque fichier est nommé d'après son `countryCode`.
2. **Simulation** (rien n'est écrit) :

   ```bash
   npm run approche:import -- C:/chemin/dossier --check-links --report rapport.md
   ```

   Pour chaque pays : schéma (Zod, toutes les anomalies), publication / licences / références, collisions, enregistrement, couverture d'affichage, adresses des sources, niveau documentaire, avertissements. Le code de sortie est non nul si un pays a une erreur.
3. **Enregistrer** les pays sans erreur :

   ```bash
   npm run approche:import -- C:/chemin/dossier --apply --worldbank --report rapport.md
   ```

   Copie dans `data/approche/` (octet pour octet), récupération des séries Banque mondiale du pays (`<ISO3>.worldbank.json`), nouveau contrôle des collisions avec ces séries, régénération du registre (`lib/approche/registry.generated.ts`) et des fichiers du contrat. Un pays avec une erreur n'est **jamais** enregistré, même en partie. `--replace` remplace un pays déjà enregistré.
4. **Vérifier le rendu** sur un site en marche (`npm run dev`, ou une préversion) :

   ```bash
   npm run approche:smoke -- http://localhost:3000
   ```

   Pour chaque pays enregistré : les six onglets répondent, et chaque observation classée « panneau », « autres sources » ou « électricité » apparaît dans la page, avec son libellé.
5. `npx tsx --test tests/*.test.ts`, `npx tsc --noEmit`, puis commit. La publication reste celle du fichier : `draft` pour un lot en relecture. **L'import ne publie rien.**

## Ce que l'import contrôle

| Famille | Contrôle |
|---|---|
| Schéma | Zod v1 : champs obligatoires, énumérations, périodes jamais vides, au moins une source par valeur |
| Publication | références croisées (sources, éléments de modules), source exclue par licence (SIPRI, y compris relayée), contenu de démonstration |
| Collisions | clé portée deux fois, clé réservée aux séries automatiques (`economy.gdp_growth`, `demography.population`…), identifiants de source ou d'observation déjà pris |
| Enregistrement | nom de fichier = `countryCode`, adresse (`slug`) unique, zone connue, fiche et carte du site existantes pour ce `slug` (l'ancien modèle fournit drapeau, carte et titre) |
| Lot | deux fichiers ne portent ni le même code ni la même adresse ; textes identiques dans au moins trois pays (gabarit non personnalisé) |
| Affichage | chaque observation vérifiée a un emplacement (tuile, module, électricité, « autres sources », panneau) ou est masquée volontairement (`theme: "none"`) |
| Sources | adresses qui répondent ; un site qui refuse les robots (403, 405) est signalé « blocked », à vérifier à la main |
| Avertissements | sources jamais citées, sans licence lue, valeurs anciennes, observation qui double une tuile sans `topic`, textes répétés |

Les protections de publication restent celles du moteur : un brouillon n'est servi qu'en préversion (`NEXT_PUBLIC_APPROCHE_DEMO=1`, interdit en production), une valeur `pending` n'est jamais affichée comme vérifiée, une source exclue bloque la fiche. Un fichier valide n'est pas pour autant **vrai** : le contrôle porte sur la forme et la traçabilité, jamais sur l'exactitude géopolitique.

## Deux niveaux documentaires, un seul moteur

| Niveau | Contenu attendu |
|---|---|
| **Essentiel** | identité (capitale, régime, chef de l'État ou du gouvernement, monnaie) ; au moins 3 sources, 3 affirmations vérifiées, 1 relation ; vue d'ensemble (forces, défis, 2 repères chronologiques) ; 1 secteur économique |
| **Approfondi** | tout l'essentiel, plus : 6 affirmations, 3 relations, 3 repères chronologiques, 3 secteurs, 1 ressource, sécurité (chiffres, organisation ou sécurité intérieure), 3 dossiers stratégiques avec opportunités et risques, 3 vulnérabilités, SWOT complet, 2 scénarios, 2 axes de veille |

Le niveau est **calculé d'après le contenu** (`lib/approche/levels.ts`, seuils modifiables) et affiché dans le bandeau de provenance. Un fichier peut déclarer le niveau visé (`documentationLevel`) : l'import signale un écart sans le bloquer. Les deux niveaux passent par les mêmes composants, le même classement des observations et les mêmes protections ; seul le degré de complétude du fichier change (un test le vérifie).

## Afficher des observations nouvelles sans composant

- Donner à l'observation un `label` lisible et une `referencePeriod`, une source, une unité cohérente.
- La rubrique se déduit du préfixe de la clé (`institutions.*` → Appartenances, `demography.*` → Démographie, `politics.*` → Vie politique, `geography.*` → Géographie, `economy.*` → Conjoncture ou Projections, `energy.*`, `infrastructure.*`, `resources.*`, `research.*`, `defense.*`, `humanitarian.*`, `security.*`) ; `theme` la précise (`ports`, `investissement`, `cyber`…) ou la masque (`none`).
- Pour comparer avec une série automatique (population, croissance, inflation…), reprendre son `topic` (voir `AUTOMATIC_SERIES` dans `lib/approche/keys.ts`) : la valeur s'ouvre dans le volet « Autres sources » de la tuile, avec organisme, période, périmètre, nature, méthode et lien ; un écart en % n'est calculé que si période, périmètre et unité sont identiques.
- Une clé inconnue du moteur est acceptée ; elle ne demande aucun développement.

## Ce qui reste manuel (hors architecture)

- La fiche du site pour ce pays (`lib/countryOverlays.ts`, `lib/countryGeoConfig.ts`) doit exister : l'import le vérifie et refuse sinon.
- Le contenu éditorial : l'import ne réécrit jamais une donnée ; il signale.
