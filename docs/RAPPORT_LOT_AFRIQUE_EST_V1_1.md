# Lot Afrique de l'Est V1.1 corrective : rapport d'intégration

**Date :** 12 novembre 2026
**Archive :** `EQUINOXE_APPROCHE_AFRIQUE_EST_10_PAYS_V1_1_CORRIGE.zip` (DJI, ERI, ETH, KEN, RWA, SDN, SOM, SSD, TZA, UGA)
**Branche :** `approche-afrique-est-v1-1`, créée depuis `main` (7a62bec). **Rien n'est fusionné dans `main`** : les fiches publiées en ligne restent la V1 jusqu'à validation de Nicolas.

## 1. Résultat

| Contrôle | Résultat |
|---|---|
| Empreintes SHA-256 du manifeste | 12 / 12 conformes, aucun fichier hors manifeste |
| Statut de publication | `published` dans `main` **et** dans la V1.1 : aucune dépublication à l'import |
| `countryCode`, `slug`, `schemaVersion` | identiques pour les dix pays ; aucune source existante supprimée (52 → 87 sources) |
| Zod, références, licences, enregistrement | 0 erreur sur les dix pays |
| Collisions avec les séries Banque mondiale | 0, y compris avec les nouvelles séries de l'Éthiopie et du Rwanda |
| Import `--replace` | fichiers identiques octet pour octet à l'archive |
| Six onglets × dix pays (smoke test) | 60 / 60 répondent, libellés retrouvés |
| Rendu texte par texte | tout s'affiche, sauf la sécurité intérieure de l'onglet Défense (défaut moteur déjà connu, inchangé) |
| TypeScript | 0 erreur |
| ESLint | 1 erreur préexistante (`tests/approche.test.ts:468`), sans lien avec le lot |
| Tests | 594 / 594 |

Les séries automatiques Banque mondiale de l'**Éthiopie** et du **Rwanda**, qui manquaient depuis la V1, ont enfin été récupérées. Leurs tuiles d'économie, jusqu'ici « Donnée non disponible », s'affichent : par exemple 933 $ de PIB par habitant en 2025 pour l'Éthiopie, et 9,4 % de croissance en 2025 pour le Rwanda.

## 2. Corrections vérifiées à l'écran

- **Rubriques** : les 7 `theme` sont normalisés et les 3 observations auparavant invisibles (Mission 300, tensions régionales ERI/ETH) s'affichent.
- **Dirigeants** :
  - Kenya et Érythrée : la tuile « Premier ministre » n'affiche plus le président ; elle indique « Donnée non disponible ». Le panneau du globe n'a plus de ligne « Chef du gouvernement ».
  - Ouganda : « Premier ministre : Robinah Nabbanja », sur la fiche comme sur le globe.
- **Somalie** : les deux dirigeants restent `conflicting`, sans aucune conversion. Les tuiles indiquent toujours « Donnée non disponible » (limite du moteur).
- **Relations bilatérales** : 11 relations visent un pays (dont 2 Érythrée–Éthiopie déjà présentes, désormais rattachées au pays). Les codes ISO3/ISO2 sont cohérents, les drapeaux existent et chaque pays cible a une fiche publiée.
- **Rwanda–RDC** : la relation apparaît dans « Divergences et tensions documentées » et dans le panneau du globe, avec le drapeau de la RDC. L'enjeu, la vulnérabilité, l'axe de veille, le 4ᵉ scénario et le repère chronologique du 21 février 2025 s'affichent aussi.
- **Scénarios** : pour ERI, ETH, SDN et SSD, le scénario 3 favorable est **remplacé** par un scénario `pressure`. Chaque pays garde trois scénarios.
- **Identité** : régime, monnaie et langue sont renseignés pour les dix pays, avec les nouvelles tuiles.
- **Ouganda** : la population de 45,9 M passe dans le volet « Autres sources » de la tuile Population. **Éthiopie** : la croissance de l'exercice 2024/25 passe dans celui de la tuile Croissance, sans calcul d'écart.
- **Adresses** : UNMISS et presidence.dj sont corrigées et répondent.

## 3. Changements visibles pour le public (à valider)

1. **Soudan** : la croissance « +3,1 % (2025) » de la fiche passe en `conflicting` et disparaît. **Mais la tuile automatique Banque mondiale continue d'afficher +3,1 % (2025)**, sans mention du −12 % d'UNData. Le site présente donc toujours un chiffre unique, contrairement à l'intention de la V1.1. Ce n'est pas une régression : c'était déjà affiché avant.
2. **Éthiopie** : 979 USD (désormais `pending`) n'apparaît plus nulle part. La tuile montre la série Banque mondiale : 933 $ (2025).
3. **Kenya et Érythrée** : « Premier ministre : Donnée non disponible » laisse croire qu'un poste existe sans être renseigné. C'est mieux qu'avant, mais le moteur reste à corriger.
4. **Quatre scénarios favorables retirés** du site : « Retour des enquêtes économiques » (ERI), « Réformes et investissement » (ETH), « Relèvement économique local » (SDN) et « Stabilisation des flux pétroliers » (SSD).
5. **Observations supprimées** : `politics.head_of_government` du Kenya et de l'Érythrée, `politics.prime_minister` de l'Ouganda (sa valeur passe dans `head_of_government`). Rien d'autre n'est supprimé.

## 4. Remarques éditoriales mineures (non corrigées, pour GPT ou Nicolas)

- **SOM**, source `S-SOM-LANG` : le champ `publisher` vaut « France Diplomatie (section linguistique uniquement ; dirigeants obsolètes) ». Cette note s'affiche telle quelle comme nom d'éditeur ; elle devrait aller dans `methodNotes`.
- **RWA** : le résumé de la relation avec la RDC et celui de l'enjeu ne datent pas la résolution 2773 (février 2025). Seuls le titre de la source et la chronologie la datent. Le site n'affiche pas `publishedAt` dans les listes de sources. Un « en février 2025 » dans les deux résumés éviterait une lecture au présent, ce que la notice demande justement.
- **UGA** : le libellé « Population selon Banque mondiale » ne colle plus, puisque la source principale est désormais l'UBOS (recensement de 2024).
- **SSD** : coquille dans la langue, « langues locales courants » au lieu de « courantes ».
- **Libellés** : « Langue(s) » dans ce lot, « Langue(s) officielle(s) » dans les autres fiches (sans effet sur la tuile, intitulée « Langue »).
- **Nature des données** : toutes les nouvelles observations d'identité portent `official_statement` (« Déclaration officielle »), y compris celles qui viennent d'UNData ou de France Diplomatie. C'est la convention de tout le lot.
- **Avertissements sans conséquence** : le libellé « PPA 2021 » du Kenya comparé à la période 2025, et la date d'adhésion du Soudan du Sud à l'EAC (2016) jugée « ancienne ».
- **Adresses à ouvrir à la main** :
  - DFAT (ERI, ETH, SDN, SOM) : délai dépassé ;
  - présidence du Kenya (cabinet) : 403 ;
  - HCR Soudan : 403 ;
  - **UBOS** (nouvelle source de l'Ouganda) : erreur de certificat.

## 5. Inchangé (limites du moteur, à traiter séparément)

Tuile « Premier ministre » à libellé fixe ; valeurs `conflicting` masquées ; onglet Défense annoncé vide quand il n'y a que de la sécurité intérieure.
