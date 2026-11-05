# Rapport consolidé — lot 2 Afrique de l'Ouest (dix fichiers livrés, neuf enregistrés)

Branche `approche-v1`, commit 51ac0fe. Tous les pays enregistrés restent en `draft`. Rien n'est dans `main`. Les fichiers sont identiques, octet pour octet, à ceux livrés par ChatGPT : aucun contenu n'a été modifié.

## Résultat de l'import

| Pays | Résultat | Erreurs | Avertissements | Observations (vérifiées) | URL à vérifier |
|---|---|---:|---:|---|---:|
| Togo (TGO) | enregistré | 0 | 5 | 13 (11) | 0 |
| Côte d'Ivoire (CIV) | enregistré | 0 | 6 | 13 (13) | 1 |
| Sénégal (SEN) | enregistré | 0 | 5 | 13 (13) | 0 |
| Niger (NER) | enregistré | 0 | 7 | 11 (11) | 1 |
| Mauritanie (MRT) | enregistré | 0 | 5 | 12 (12) | 0 |
| Gambie (GMB) | enregistré | 0 | 7 | 12 (12) | 0 |
| Guinée-Bissau (GNB) | enregistré | 0 | 5 | 13 (12) | 0 |
| Sierra Leone (SLE) | enregistré | 0 | 6 | 12 (12) | 0 |
| Liberia (LBR) | enregistré | 0 | 6 | 13 (13) | 0 |
| **Cap-Vert (CPV)** | **refusé, non enregistré** | **2** | 5 | 12 (12) | 1 |

Contrôles : Zod, publication, sources et références, collisions avec les séries automatiques : aucune anomalie, pour les dix. Séries Banque mondiale générées pour les neuf pays enregistrés.

Tests : 538 passent. TypeScript : propre. ESLint : propre sur `app`, `components`, `lib`, `scripts` (les erreurs restantes du dépôt sont dans `tests/` et dans des copies de travail `.claude/`, antérieures). Validateur Zod : 9 fichiers valides. Smoke test : 17 pays × 6 onglets, tous les libellés retrouvés.

## Cap-Vert : bloqué par le site, pas par le contenu

Le fichier est valide. Deux erreurs d'enregistrement : le slug « cap-vert » n'a ni fiche pays dans l'ancien modèle (`lib/countries/`, qui fournit la carte, le drapeau et le titre de la page) ni configuration de carte (`lib/countryGeoConfig.ts`). Créer ces deux éléments ajouterait un pays à la liste de la zone Afrique, donc ce n'est pas un simple import : décision à prendre. Le fichier est conservé dans le dossier de travail, rien n'est perdu.

## Points de vigilance demandés

- **Togo, institutions :** le Président de la République (Jean-Lucien Savi de Tové, source Présidence togolaise) et le Président du Conseil (Faure Essozimna Gnassingbé, source France Diplomatie) sont deux fonctions distinctes, bien séparées. Le régime est libellé « République parlementaire ; exécutif conduit par le président du Conseil ».
- **Sénégal, Premier ministre :** « Ahmadou Al Aminou Mohamed Lô », une seule source (France Diplomatie). Je ne peux pas le vérifier de mon côté. Voir l'anomalie 3 ci-dessous.
- **Niger, retrait de la CEDEAO :** « Retrait effectif le 29 janvier 2025 », source CEDEAO, appartenance à la Confédération AES. Même contenu que le Burkina Faso, mais libellés différents entre pays (voir avertissements).
- **Guinée-Bissau :** « Transition militaire depuis novembre 2025 » et suspension de la CEDEAO. Les élections du 6 décembre 2026 sont présentées comme annoncées, pas tenues (axe de veille : « Vérifier la tenue effective des élections, sans anticiper leur résultat »).
- **Gambie :** la présidentielle du 5 décembre 2026 est traitée comme à venir (axe de veille « Ne pas anticiper le résultat »).
- **Cap-Vert :** scrutin présidentiel annoncé pour le 15 novembre, mais la fiche n'est pas enregistrée (voir ci-dessus).
- **Observations `pending` :** trois (Togo : pauvreté rurale et urbaine ; Guinée-Bissau : part du cajou dans les exportations). Aucune valeur n'est affichée : le panneau indique « À vérifier sur la source officielle » et « Valeurs en attente de vérification ». Un test le garantit désormais.

## Anomalies éditoriales à transmettre à ChatGPT (non corrigées par moi)

1. **SWOT : titres et résumés décalés, dans les neuf pays.** Les résumés semblent assemblés automatiquement et rattachés au mauvais élément. Exemples :
   - Togo, faiblesse « Écarts de pauvreté » : le résumé parle de « l'architecture du pouvoir exécutif ».
   - Gambie, faiblesse « Risque élevé de dette » : le résumé parle de l'élection de décembre 2026 ; faiblesse « Réforme constitutionnelle inaboutie » : le résumé parle de la dépendance au Sénégal.
   - Sierra Leone : les deux faiblesses sont interverties (« Inflation à nouveau élevée » parle de la réforme électorale, « Polarisation du débat électoral » parle de l'inflation).
   - Liberia, force « Alternances électorales » : le résumé parle de réponse judiciaire et portuaire.
   - Mauritanie, force « Diversification énergétique » : le résumé parle du financement de l'accueil des réfugiés.
   - Sénégal, force « Pôle de Dakar » : le résumé parle des recettes attendues et de la gouvernance budgétaire.
   Les formulations « Un levier pour Togo : … » et « Cette contrainte pèse sur la réponse à … » sont lourdes et fautives (« les indicateurs : rôle du président du conseil , activité du parlement »). À réécrire pays par pays.
2. **Rubriques absentes ou minces :** pas de vulnérabilités (0 sur 3 attendues), pas d'opportunités et risques (0 sur 2), par exemple 2 affirmations vérifiées sur 5 en Gambie et au Cap-Vert, aucune affirmation recoupée par deux sources dans ces deux fiches, 2 à 3 sources par pays (en Gambie, une source datée sur deux).
3. **Sources des dirigeants :** Togo, Sénégal, Guinée-Bissau et Gambie citent France Diplomatie pour les chefs d'État et de gouvernement. La notice juge elle-même cette fiche obsolète sur les dirigeants au Niger. Le Premier ministre du Sénégal et le chef du gouvernement de Guinée-Bissau demandent une source gouvernementale.
4. **Libellés non harmonisés :** « Régime institutionnel » (ce lot) contre « Régime politique » (lot précédent) ; « Langue officielle » contre « Langue nationale et langues de travail » (Niger) ; Niger « Ancien membre de la CEDEAO » contre Burkina « Retrait de la CEDEAO effectif » et Mali « Ancien membre de la CEDEAO (retrait) » ; « Membre de la Confédération AES » contre « Membre de l'Alliance des États du Sahel » ; Gambie, « Membre du Commonwealth depuis son retour en 2018 » cite une année absente de la période.
5. **Texte identique dans les dix pays :** « Analyses prospectives conditionnelles ; le contexte peut évoluer après le 2 novembre… ». C'est un avertissement de prudence répété, à garder ou à individualiser. Répété aussi au moins trois fois dans chaque fiche.
6. **Topics manquants :** l'inflation en Gambie, au Liberia et en Sierra Leone peut doubler la tuile « Inflation (IPC) » ; ajouter `topic: "inflation"` pour que la valeur apparaisse dans « Autres sources ».
7. **Adresses de sources non vérifiables depuis mon poste :** Côte d'Ivoire (présidence.ci, certificat non vérifiable), Niger (Refworld, 403), Cap-Vert (boe.incv.cv, connexion réinitialisée). À contrôler à la main.

## Niveaux documentaires

Aucun niveau n'est déclaré ni affiché. Le profil de couverture interne montre des fiches plus légères que le lot précédent (couverture 65 à 71 %, qualité des sources 53 à 65 %). Il ne sert que d'indicateur interne.
