# Rapport consolidé — lot Afrique de l'Est V1

Branche `approche-v1` (avancée sur `main` avant l'import). Archive : `EQUINOXE_APPROCHE_AFRIQUE_EST_10_PAYS_V1.zip`, passe documentaire du 12 novembre 2026. Dix pays : Djibouti, Érythrée, Éthiopie, Kenya, Rwanda, Soudan, Somalie, Soudan du Sud, Tanzanie, Ouganda.

**Mise à jour du 12 novembre 2026 (soir) : sur ordre de Nicolas, les dix fiches sont passées de `draft` à `published` et fusionnées dans `main`.** Seul le champ `publication` a changé ; pour le reste, les dix JSON sont identiques à l'archive (empreintes du manifeste vérifiées à l'import : 10 sur 10). Les défauts décrits ci-dessous sont donc en ligne tant qu'ils ne sont pas corrigés : dirigeants somaliens masqués (§ 2), onglet Défense annoncé vide (§ 3), intitulé « Premier ministre » pour le Kenya, l'Ouganda et l'Érythrée (§ 4), séries Banque mondiale absentes pour l'Éthiopie et le Rwanda (§ 1). Aucun contenu géopolitique, aucun millésime, aucun libellé n'a été modifié par moi. Aucun changement de design ni de niveau documentaire.

## Résultat

| Pays | Erreurs | Avertissements | Observations (vérifiées) | Affichées / masquées | URL à vérifier |
|---|---:|---:|---|---|---:|
| Djibouti (DJI) | 0 | 4 | 8 (8) | 7 / 1 | 1 |
| Érythrée (ERI) | 0 | 5 | 9 (9) | 8 / 1 | 1 |
| Éthiopie (ETH) | 0 | 5 | 9 (9) | 8 / 1 | 1 |
| Kenya (KEN) | 0 | 6 | 10 (10) | 10 / 0 | 1 |
| Rwanda (RWA) | 0 | 5 | 9 (8, 1 en attente) | 8 / 1 | 0 |
| Soudan (SDN) | 0 | 7 | 9 (9) | 9 / 0 | 2 |
| Somalie (SOM) | 0 | 5 | 9 (7, 2 contradictoires) | voir § 2 | 1 |
| Soudan du Sud (SSD) | 0 | 6 | 9 (9) | 9 / 0 | 1 |
| Tanzanie (TZA) | 0 | 5 | 8 (8) | 8 / 0 | 0 |
| Ouganda (UGA) | 0 | 8 | 10 (10) | 10 / 0 | 0 |

- **Zod, références, licences, collisions avec les clés réservées aux séries automatiques, doublons d'identifiants** : aucune anomalie, dix pays sur dix.
- **Configurations du site** : fiche du modèle historique (`lib/countries/`), configuration cartographique, liste de la zone Afrique et contour GeoJSON présents pour les dix pays. Rien à créer.
- **Tests** : 593 passent. **TypeScript** : propre. **ESLint** (`app`, `components`, `lib`, `scripts`, `types`) : propre. **Validateur Zod** : dix fichiers valides.
- **Smoke test** : dix pays × six onglets répondent, tous les libellés attendus retrouvés.
- **Séries Banque mondiale** : huit pays sur dix, voir § 1.

## Affichage vérifié dans les pages servies

Contrôle fait sur le HTML visible de chaque onglet, texte par texte.

- **80 cartes SWOT** : 80 sur 80 affichées, titre et résumé ; chaque résumé relu correspond à son titre (aucun décalage, contrairement aux lots précédents).
- **30 vulnérabilités**, **30 scénarios** (avec hypothèses, déclencheurs, signaux faibles, conséquences, limites), **20 axes de veille** : tous affichés.
- **30 dossiers stratégiques** (situation, intérêt stratégique, indicateurs, incertitudes) et **40 opportunités et risques** : tous affichés.
- **40 affirmations** et **20 relations** : toutes affichées.
- **Vue d'ensemble** (atouts, défis, chronologie) et **Économie** (secteurs, ressources) : tout est affiché.
- **Défense et sécurité** : rien n'est affiché, voir § 3.

## Anomalies techniques

### 1. Séries Banque mondiale : huit pays sur dix

Le service de la Banque mondiale n'a répondu que par intermittence le 12 novembre (erreurs 502 et délais dépassés), malgré de nombreuses relances.

- **Récupérées et enregistrées** (`<ISO3>.worldbank.json`) : Djibouti, Érythrée, Kenya, Soudan, Somalie, Soudan du Sud, Tanzanie, Ouganda. Contrôle des collisions refait avec ces séries : aucune anomalie, huit pays sur huit.
- **Manquantes** : Éthiopie et Rwanda. Leurs tuiles population, PIB, PIB par habitant, croissance, inflation, chômage et superficie affichent « Donnée non disponible ». À relancer quand le service répond : `npx tsx scripts/sync-approche-worldbank.ts ETH RWA`, puis `npm run approche:contract` et un nouveau contrôle des collisions. Le contrôle des collisions avec les clés réservées, lui, est déjà fait et propre pour ces deux pays.
- Le smoke test et le contrôle d'affichage ont été faits avant l'arrivée des séries ; le rendu des tuiles alimentées par la Banque mondiale n'a pas été revu page par page.

### 2. Somalie : le statut `conflicting` est masqué par le moteur

Les observations `politics.head_of_state` (Hassan Sheikh Mohamud) et `politics.head_of_government` (Hamza Abdi Barre) sont en `conflicting`. Le moteur n'a aucun affichage pour ce statut : les tuiles « Chef de l'État » et « Premier ministre » affichent « Donnée non disponible », ni le nom ni le libellé du fichier n'apparaissent, et le compteur « Valeurs en attente de vérification » reste à 0.

Le désaccord entre la Cour suprême (5 novembre 2026) et le parquet (7 novembre) reste lisible ailleurs : texte d'en-tête, chronologie, observation `politics.supreme_court_nov2026`, SWOT, vulnérabilités, scénarios, axe de veille. Mais la consigne de la notice (« ne pas masquer le conflit ») n'est pas tenue pour les deux tuiles.

Décision attendue : faut-il que le moteur affiche une valeur contradictoire avec une mention explicite (par exemple « Positions contradictoires », libellé du fichier, sources des deux positions) ? C'est une évolution du moteur, qui s'appliquerait aussi à la population 2026 de la Guinée, aujourd'hui masquée pour la même raison.

### 3. Onglet « Défense et sécurité » : annoncé vide alors qu'il a du contenu

Chaque fiche du lot porte deux entrées de sécurité intérieure (`modules.defense.internalSecurity`, 20 au total). L'onglet affiche « Aucune donnée de défense n'est publiée pour ce pays pour l'instant ». Cause : le test « onglet vide » de `components/approche/DefenseTab.tsx` ne regarde que les indicateurs, l'organisation, les opérations, les équipements et le dispositif de vigilance ; il ignore la sécurité intérieure.

Le défaut est antérieur à ce lot. Il touche 35 fiches : les dix de ce lot et 25 fiches déjà publiées (AGO, BDI, BEN, BFA, CAF, CIV, CMR, COD, COG, CPV, GAB, GHA, GIN, GMB, GNB, GNQ, LBR, MRT, NER, NGA, SEN, SLE, STP, TCD, TGO), soit 42 entrées publiées invisibles.

Correctif possible : une ligne (compter la sécurité intérieure dans le test). Il ferait apparaître la rubrique « Sécurité intérieure », déjà dessinée, sur ces 35 fiches. Non fait : il change des pages publiées.

### 4. Tuile « Premier ministre » : intitulé fixe, trompeur pour trois pays

L'intitulé des tuiles de dirigeants est écrit dans le composant (`components/approche/OverviewTab.tsx`), le `label` du fichier est ignoré. Effet :

- Kenya : « Premier ministre : William Ruto » (le fichier dit « Chef de l'exécutif » ; le Kenya n'a pas de Premier ministre, le Premier secrétaire du Cabinet est Musalia Mudavadi) ;
- Ouganda : « Premier ministre : Yoweri Museveni » (le fichier dit « Chef de l'exécutif » ; la Première ministre Robinah Nabbanja figure dans une autre observation) ;
- Érythrée : « Premier ministre : Isaias Afwerki » (le fichier dit « Chef du gouvernement ») ;
- Soudan : « Chef de l'État » au lieu de « Président du Conseil souverain de transition », « Premier ministre » au lieu de « Premier ministre (autorités de transition) ».

Décision attendue : soit le moteur affiche le libellé du fichier quand il existe, soit ChatGPT n'utilise `politics.head_of_government` que pour un véritable chef de gouvernement distinct du chef de l'État.

### 5. Trois observations vérifiées sans emplacement

Les préfixes `policy.` et `diplomacy.` ne correspondent à aucune rubrique du moteur :

- DJI `policy.mission300_joined_2026` (participation à Mission 300) ;
- ERI `diplomacy.regional_tensions_oct2026` (appel de l'Union africaine à la désescalade) ;
- ETH `diplomacy.regional_tensions_oct2026` (appel à la retenue de l'Union africaine).

Il suffit que ChatGPT leur donne un `theme` existant (`politique`, `securite`, `energie`…). RWA `policy.nst2_2030_horizon` aura le même problème le jour où elle recevra une valeur.

### 6. Rwanda : statut `pending`

`policy.nst2_2030_horizon` (valeur `null`) n'est pas affichée et le compteur de la page indique « Valeurs en attente de vérification : 1 ». C'est le comportement prévu : aucune valeur en attente n'est présentée comme vérifiée.

### 7. Rubriques (`theme`) écrites en toutes lettres

Sept observations portent un `theme` qui n'est pas un identifiant : « Situation humanitaire » (SDN × 2, SSD × 1, UGA × 3) et « Développement humain » (KEN × 1). Elles s'affichent quand même, la rubrique étant déduite du préfixe de la clé. Identifiants à écrire : `humanitaire`, `developpement`.

### 8. Adresses des sources

52 adresses contrôlées, 44 répondent.

| Pays | Adresse | Résultat |
|---|---|---|
| SSD | `unmiss.unmissions.org/en/news/press-release-unmiss-urges-inclusive-dialogue-protection-of-civilians-and-renewed` | 404, lien mort (l'adresse semble tronquée) |
| DJI | `presidence.dj/composition` | aucune réponse (erreur de certificat sans `www`) |
| ERI, ETH, SDN, SOM | `dfat.gov.au/geo/heads-of-government/<pays>` | délai dépassé |
| KEN | `president.go.ke/cabinet/` | 403, refuse les robots |
| SDN | `unhcr.org/news/press-releases/unhcr-and-iom-warn-millions-sudan-…` | 403, refuse les robots |

Les sept dernières sont à ouvrir à la main dans un navigateur : je ne les ai pas recontrôlées autrement.

## Problèmes éditoriaux (pour ChatGPT, rien corrigé)

Je n'ai pas pu vérifier l'exactitude des faits de 2026 : le contrôle porte sur la forme, la traçabilité et la cohérence interne.

**Valeurs à vérifier**

- **Ouganda** : `demography.population_2024_wb_country` = 45,9 millions (2024), attribuée à la Banque mondiale. La valeur ressemble à celle du recensement national de 2024 ; elle s'écartera de la série automatique de la Banque mondiale affichée dans la tuile. Préciser la source d'origine, et ajouter `topic: "population"` pour qu'elle s'ouvre dans « Autres sources ».
- **Soudan et Somalie** : la même croissance 2025 de 3,1 % figure dans les deux fiches. Coïncidence ou report d'une fiche à l'autre : à confirmer.
- **Éthiopie** : croissance de 9,2 % (exercice 2024/25) et PIB par habitant de 979 USD (2025) attribués à la Banque mondiale ; vérifier s'il s'agit de chiffres officiels éthiopiens repris par la Banque mondiale.
- **Soudan** : capitale « Khartoum ». À relire au regard du siège réel des autorités au moment de la publication.
- **Soudan** : `economy.gdp_contraction_2023_wb` est une valeur de 2023 ; son libellé le dit, sa méthode devrait le dire aussi.

**Couverture**

- **Rwanda** : aucune relation, vulnérabilité ni scénario ne porte sur la RDC et l'est du Congo. Les deux relations visent l'EAC et la Banque mondiale.
- **Relations** : les 20 relations du lot visent des organisations (Banque mondiale, EAC, Union africaine, HCR, UNMISS…) ; aucune ne vise un pays (`targetCode` vide partout). L'onglet « Relations internationales » ne montre donc aucune relation bilatérale, y compris Éthiopie–Érythrée, Soudan–Soudan du Sud ou Djibouti–Éthiopie.
- **Scénarios** : neuf pays n'ont que des scénarios « renforcement » et « fragilité » ; seul le Rwanda a un scénario « pression ». Huit pays ont deux scénarios favorables pour un défavorable, y compris le Soudan.
- **Identité** : le régime n'est renseigné que pour l'Érythrée, le Soudan et le Soudan du Sud, la monnaie que pour l'Érythrée, la langue pour aucun pays ; ailleurs les tuiles « Régime », « Monnaie » et « Langue » affichent « Donnée non disponible ».
- **Défense** : aucun indicateur, effectif ni organisation pour les dix pays.

**Sources**

- 15 sources datées sur 52 (`publishedAt`) ; aucune pour le Kenya, le Rwanda et l'Ouganda.
- 3 affirmations recoupées par au moins deux sources sur 40 (Soudan, Somalie, Tanzanie).
- Dirigeants de l'Érythrée, de l'Éthiopie, du Soudan et de la Somalie sourcés en partie par la page du gouvernement australien, injoignable le jour du contrôle.

**Libellés non harmonisés** (avertissements de l'import, jamais bloquants)

- `institutions.eac` : cinq intitulés différents (« Membre de la Communauté d'Afrique de l'Est », « Membre de l'EAC », « Membre de l'EAC depuis 2024 », « Membre de l'EAC depuis 2016 », « Membre et siège de l'EAC »).
- `politics.regime` : « Système politique » (ERI), « Situation institutionnelle » (SDN, SSD), « Régime politique » ailleurs.
- `politics.head_of_state` et `politics.head_of_government` : voir § 4.
- KEN `development.poverty_2025_wb_3usd_ppp` : le libellé cite l'année 2021 (parité de pouvoir d'achat) alors que la période est 2025 ; c'est correct sur le fond, l'import le signale seulement.
- Trois observations doublent une tuile sans `topic` : ETH `economy.growth_fy2024_25_wb` (croissance), RWA `economy.gdp_growth_2026_h1_wb` (croissance ; à laisser sans `topic` si l'on veut éviter de présenter un semestre comme une année), SOM `economy.inflation_jul2026_wb` (inflation).

**Points de vigilance de la notice : état constaté dans les pages**

- Somalie : conflit non converti en fait tranché ; mais dirigeants masqués (§ 2).
- Soudan du Sud : le scrutin du 22 décembre 2026 est présenté comme annoncé, « tenue incertaine » ; aucun résultat anticipé.
- Soudan : déplacés (11 347 007, 2 novembre) et besoins en abris (15,4 millions, 6 novembre) sont deux observations distinctes, avec un axe de veille qui rappelle de ne pas les confondre.
- Ouganda : réfugiés (1 972 339) + demandeurs d'asile (88 667) = total (2 061 006) ; les trois valeurs sont affichées avec leurs libellés ; le risque de double compte tient à la lecture, pas aux chiffres.
- Rwanda : la croissance du premier semestre 2026 est libellée comme telle, dans un panneau séparé de la tuile annuelle.
- Kenya : la dette du Trésor (66,9 % du PIB, août 2026) est seule présente ; aucune valeur Banque mondiale concurrente n'est affichée.
- Tanzanie : les violences postélectorales sont attribuées aux organisations qui les documentent.

## Décisions attendues de Nicolas

1. Somalie : afficher ou non les valeurs contradictoires (§ 2).
2. Onglet Défense : corriger ou non le test « onglet vide », qui toucherait aussi 25 fiches publiées (§ 3).
3. Intitulé des tuiles de dirigeants (§ 4).
4. Renvoi à ChatGPT des points éditoriaux et des § 5, 7 et 8.

Les dix fiches sont publiées dans `main` depuis le 12 novembre 2026 (ordre de Nicolas). Les JSON corrigés de ChatGPT suivront la procédure habituelle : import en `draft` sur une branche annexe, publication après validation.
