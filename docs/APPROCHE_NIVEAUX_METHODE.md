# Niveaux documentaires : méthode proposée (à valider)

**Statut : proposition, non appliquée.** Aucun niveau n'est calculé ni imposé par le moteur, et aucun niveau existant n'est modifié. Le niveau (`documentationLevel`: `essential` ou `extended`) est une décision **éditoriale** : il n'est affiché dans le bandeau de provenance que s'il est déclaré dans le fichier du pays. Aucun des huit pays enregistrés n'en déclare à ce jour.

Les deux niveaux utilisent exactement le même moteur : mêmes composants, même classement des observations, mêmes protections de publication et de licences. Seul le degré de documentation du fichier diffère (un test vérifie qu'un niveau déclaré ne change aucun classement).

## Ce que mesure le profil de couverture (`lib/approche/levels.ts`)

Le rapport d'import et `npm run approche:levels` donnent, pour chaque pays, trois axes entre 0 et 100 %. Ils informent la décision ; ils ne la remplacent pas.

### 1. Couverture des contenus
Part des blocs attendus qui sont renseignés (17 blocs) : identité, dirigeants, appartenances, affirmations vérifiées (5), relations (3), forces et défis, repères chronologiques (3), secteurs (3), ressources, indicateurs propres au pays (8 hors identité et appartenances), défense et sécurité, dossiers stratégiques (3), opportunités et risques, vulnérabilités (3), SWOT à quatre quadrants, scénarios (2), axes de veille (2).

### 2. Qualité des sources
Moyenne de cinq parts : sources citées (aucune source de gabarit inutilisée), diversité des organismes (6 attendus), sources datées (`publishedAt`), réutilisation connue (pas `unknown`), affirmations recoupées par au moins deux sources.

### 3. Contenus spécifiques au pays
Moyenne de deux parts : textes longs (50 caractères et plus) **absents des autres pays enregistrés**, et textes **non répétés** d'une rubrique à l'autre dans la fiche. Sans autre pays à comparer, la première part n'est pas évaluée.

Deux lectures existent : le rapport d'import mesure le fichier **tel que livré** ; `npm run approche:levels` mesure la fiche **fusionnée avec ses séries automatiques** (les sources de la Banque mondiale s'ajoutent aux sources). Les chiffres ci-dessous sont ceux de la fiche fusionnée.

## Résultats sur les huit pays (au 02/11/2026)

| Pays | Couverture des contenus | Qualité des sources | Contenus spécifiques | Seuils proposés |
|---|---|---|---|---|
| France | 100 % | 73 % | 100 % | Essentiel |
| Mali | 100 % | 81 % | 100 % | Approfondi |
| Chine | 100 % | 88 % | 100 % | Approfondi |
| Bénin | 100 % | 65 % | 60 % | aucun niveau |
| Nigéria | 100 % | 79 % | 60 % | aucun niveau |
| Ghana | 100 % | 70 % | 62 % | aucun niveau |
| Guinée | 100 % | 68 % | 61 % | aucun niveau |
| Burkina Faso | 100 % | 75 % | 62 % | aucun niveau |

Seuils proposés (couverture / sources / spécifique) : **essentiel** ≥ 60 % / 60 % / 70 % ; **approfondi** ≥ 85 % / 75 % / 90 %.

## Ce que ces résultats montrent (et leurs limites)

- Les huit fiches renseignent toutes les rubriques : l'axe « couverture » ne distingue donc rien à ces seuils. Il détecte une fiche à trous, pas une fiche pauvre.
- L'axe « spécifique » sépare nettement les trois pays pilotes (100 %) du lot de cinq (60 à 62 %) : ce sont les scénarios et formules de gabarit repris à l'identique (voir les avertissements du rapport). Les corrections attendues de ChatGPT devraient le relever.
- La France obtient « Essentiel » avec ces seuils parce que seules 2 de ses 8 affirmations sont recoupées par deux sources et que 35 sources sur 56 sont datées : c'est une conséquence du seuil de 75 % pour les sources, pas un jugement sur la fiche. **Ce résultat montre que les seuils doivent être discutés avant tout usage.**
- Un axe ne dit rien de la vérité des contenus ni de la valeur des sources (un organisme officiel et un blog comptent pareil dans la diversité) : la qualité des sources reste un jugement éditorial.

## Décisions à prendre avant d'appliquer quoi que ce soit

1. Garder les trois axes, ou en ajouter (par exemple une profondeur par rubrique, plutôt qu'un seuil de présence).
2. Les seuils (ou une lecture par bandes plutôt que par seuil unique).
3. Qui déclare le niveau (fichier du pays, par ChatGPT, ou validé à la relecture) et à quel moment.
4. Si le niveau doit être affiché au lecteur ou rester un outil interne.

Tant que ces points ne sont pas tranchés : aucun niveau déclaré, aucun niveau affiché, aucun niveau recalculé.
