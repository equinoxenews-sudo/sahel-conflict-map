# Rapport consolidé — lot Afrique centrale V1.1 (dix fichiers livrés, neuf enregistrés)

Branche `approche-v1`. Archive utilisée : `EQUINOXE_APPROCHE_LOT_10_PAYS_AFRIQUE_CENTRALE_V1_1.zip`, seule, sans mélange avec le lot 2 Afrique de l'Ouest. Les neuf pays enregistrés sont en `draft`, identiques octet pour octet aux fichiers livrés. Rien n'est dans `main`. Aucun contenu n'a été modifié.

## Résultat de l'import

| Pays | Résultat | Erreurs | Avertissements | Observations (vérifiées) |
|---|---|---:|---:|---|
| Angola (AGO) | enregistré | 0 | 4 | 11 (11) |
| Burundi (BDI) | enregistré | 0 | 4 | 12 (12) |
| République centrafricaine (CAF) | enregistré | 0 | 5 | 11 (11) |
| Cameroun (CMR) | enregistré | 0 | 2 | 12 (12) |
| République démocratique du Congo (COD) | enregistré | 0 | 3 | 11 (11) |
| République du Congo (COG) | enregistré | 0 | 2 | 12 (12) |
| Gabon (GAB) | enregistré | 0 | 4 | 11 (11) |
| Guinée équatoriale (GNQ) | enregistré | 0 | 3 | 12 (12) |
| Tchad (TCD) | enregistré | 0 | 3 | 12 (12) |
| **São Tomé-et-Príncipe (STP)** | **refusé, non enregistré** | **2** | 4 | 12 (12) |

Zod, publication, sources, licences, collisions avec les séries Banque mondiale : aucune anomalie pour les dix. Séries Banque mondiale générées pour les neuf pays enregistrés. Tests : 540 passent. TypeScript : propre. ESLint (`app`, `components`, `lib`, `scripts`) : propre. Validateur Zod : 9 fichiers valides. Smoke test : 9 pays × 6 onglets, tous les libellés retrouvés. 104 observations : aucune valeur sans unité, aucun pourcentage hors plage, toutes les périodes sont bien formées, toutes sont `verified`.

## À décider avant de créer : São Tomé-et-Príncipe

Le fichier est valide. Il manque quatre éléments au site, que je n'ai pas créés :

1. aucune fiche pays dans le modèle historique (`lib/countries/`) ;
2. aucune configuration de carte (`lib/countryGeoConfig.ts`) ;
3. aucune entrée dans la liste des pays de la zone Afrique (`lib/zoneCountries.ts`, régénérée à partir des fiches) ;
4. aucun contour dans le fond de carte du site (`public/data/world-countries.geo.json`). Comme pour le Cap-Vert, le contour viendrait de Natural Earth 50 m (domaine public, téléchargement).

Les neuf autres pays disposent des quatre éléments. Le fichier STP reste dans le dossier de travail.

## Points de vigilance demandés

- **Guinée équatoriale, capitale :** la fiche donne « Ciudad de la Paz (capitale officielle depuis janvier 2026 ; transfert progressif) », sourcée par le Décret-loi 1/2026 (publié le 2 janvier 2026) ; Malabo et Bata gardent des fonctions pendant le transfert. Les pages affichent bien Ciudad de la Paz. **Incohérence avec le modèle historique :** `lib/countries/guinee-equatoriale.ts` indique toujours « Malabo ». Ce champ sert à placer sur le globe les informations d'ordre national d'un pays. Je n'y ai pas touché ; décision à prendre.
- **République centrafricaine, MINUSCA :** la fiche indique un mandat « prolongé jusqu'au 15 novembre 2026 » (résolution 2800, 2025). Le mandat expire dans dix jours : l'information sera périmée dès le vote du Conseil de sécurité. La source est la page générique du mandat sur le site de la MINUSCA. À mettre à jour après le vote.
- **RDC, Est :** les affirmations parlent de la « persistance du M23 » ; la chronologie cite l'accord de Washington (juin 2025) et la déclaration de principes de Doha. Aucune source ne documente 2026 pour l'Est (la seule source récente est France Diplomatie, 29 octobre 2026). Je ne peux pas dire si la situation décrite est à jour au 4 novembre 2026.
- **Dirigeants et institutions :** noms lus dans les fichiers : Cameroun (Paul Biya ; Premier ministre Joseph Dion Ngute), Tchad (Mahamat Idriss Déby Itno ; Allamaye Halina), République centrafricaine (Touadéra, réélu en décembre 2025 ; Félix Moloua), République du Congo (Denis Sassou N’Guesso ; Anatole Collinet Makosso), RDC (Tshisekedi ; Judith Suminwa Tuluka), Gabon (Oligui Nguema, aussi chef du gouvernement), Guinée équatoriale (Obiang ; Premier ministre Manuel Osa Nsue Nsua), Angola (João Lourenço, président et chef de l’exécutif), Burundi (Évariste Ndayishimiye ; Nestor Ntahontuye). Sources nationales pour le chef du gouvernement : Cameroun (Services du Premier ministre), République du Congo (Présidence), RDC et Burundi (Primatures). Tchad, République centrafricaine, Gabon, Angola (chef du gouvernement) s’appuient sur France Diplomatie seule ; la Guinée équatoriale cite la Banque mondiale pour son chef du gouvernement ; le chef d’État angolais cite l’ambassade d’Angola. Je ne peux pas vérifier ces noms de mon côté : à confirmer par une source officielle quand elle manque.
- **Dates et unités :** cohérentes. Les mélanges de périodes (semestre, mois, moyenne annuelle, projection) sont distingués par leur libellé et leur période : par exemple Angola, croissance 7,2 % au premier semestre 2026 et 4,5 % projetés pour 2026 ; Burundi, inflation moyenne 2025 (34 %) et inflation annuelle d'août 2026 (8,4 %).

## Avertissements du moteur à traiter

1. **République centrafricaine : une observation invisible.** `development.human_capital_index_2020_wb` (indice de capital humain 2020) n'a aucune rubrique (ni `theme`, ni préfixe de clé connu) : elle n'apparaît nulle part. À rattacher à un thème. Elle est aussi signalée comme ancienne (2020).
2. **`topic` manquant :** croissance (Angola, Guinée équatoriale), inflation (Angola, Burundi ×2, RDC, Gabon), PIB par habitant (São Tomé) : pour que ces valeurs apparaissent dans « Autres sources » au lieu d'un panneau à part.
3. **Libellés non harmonisés :** « Langue(s) officielle(s) » contre « Langue officielle » (lot précédent) ; la République centrafricaine « Réélection du président lors du scrutin de décembre 2025 » contre le Gabon « Élection présidentielle ayant clos la transition ».
4. **Tchad :** pauvreté 2022 (44,8 %), valeur ancienne à dire dans son libellé.

## Incohérences éditoriales à transmettre à ChatGPT (non corrigées par moi)

1. **Fiches plus légères que le lot Afrique de l'Ouest V2.1 :** 3 à 4 sources, 1 à 2 relations (3 ailleurs), un seul élément par case du SWOT, aucune vulnérabilité (0 sur 3). Les SWOT lus (neuf pays) sont cohérents avec leurs titres, et les signaux faibles se rapportent bien à leur scénario.
2. **Phrases d'affirmation mécaniques :** « Mandat de la MINUSCA prolongé jusqu'au  : 2026-11-15  (2025-11-13) selon la source citée. », « Croissance du PIB réel estimée en 2025  : 5,5 % (2025) selon la source citée. » : doubles espaces, dates ISO dans le texte, période répétée.
3. **Sources sans date de publication :** la plupart des pages Banque mondiale, Primature, BEAC.
4. **Nom officiel dans le modèle historique :** voir Guinée équatoriale ci-dessus.

## Niveaux documentaires

Aucun niveau n'est déclaré ni affiché. Couverture interne : 65 à 71 %, qualité des sources 57 à 63 %.
