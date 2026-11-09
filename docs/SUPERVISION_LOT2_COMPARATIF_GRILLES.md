# Supervision V1 — Lot 2 : prototype du tableau de bord et comparatif GridStack / React Grid Layout

Branche : `supervision-lot2-prototype` (créée depuis `main`, rien fusionné). Rédigé le 9 novembre 2026.
Données **entièrement fictives** (chaque titre porte « [DÉMO] »), **aucune base**, **aucun appel IA**, aucune écriture hors du navigateur (sauvegarde locale).

## 1. Recommandation

**React Grid Layout 2 pour la V1, derrière l'interface d'adaptateur déjà en place** (`components/supervision-lab/engines/types.ts`).

Raisons, toutes mesurées pendant le prototype :
- **Intégration beaucoup plus simple** : 55 lignes d'adaptateur contre 145, et aucun défaut d'intégration rencontré, alors que GridStack en a demandé cinq (section 4).
- **Modèle naturel en React** : la grille est *contrôlée* par notre état, exactement ce que veut le cahier (la disposition est à nous, enregistrée en base plus tard). GridStack possède son propre DOM et son propre état : il faut les synchroniser dans les deux sens, source de boucles (observée).
- **Plus léger** : 23,6 Ko gzip contre 29,0 Ko (hors CSS : 0,6 + 0,6 Ko contre 2,9 Ko).
- **Écosystème** : environ 6,2 millions de téléchargements par semaine contre 0,96 million (npm, semaine du 2 au 8 nov. 2026).

Réserves honnêtes :
- GridStack n'a **aucune dépendance** (RGL en a six : `clsx`, `fast-equals`, `prop-types`, `react-draggable`, `react-resizable`, `resize-observer-polyfill`) et il a une **gestion tactile du glisser-déposer** intégrée, y compris depuis un bandeau extérieur. Le glisser-déposer **depuis le bandeau** de RGL repose sur le glisser-déposer natif du navigateur, qui **ne fonctionne pas au doigt**. Atténuation déjà en place : le clic « ajouter » et les boutons de position/taille du panneau fonctionnent au doigt et au clavier (neutres vis-à-vis du moteur).
- RGL 2 est une **réécriture récente** (v2.3.0, octobre 2026) : moins éprouvée que la v1. GridStack 14.1.0 date du 4 novembre 2026 et a une longue histoire (les deux projets existent depuis 2015 et 2014).
- **Aucun test sur vrai téléphone ni sur Safari/Firefox** n'a pu être fait ici (voir section 6) : à faire avant de trancher définitivement.

## 2. Ce que montre la démonstration

Deux pages identiques, une par moteur, sous `/supervision-lab/gridstack` et `/supervision-lab/rgl` (réservées au compte fondateur, non référencées ; page d'accueil du comparatif : `/supervision-lab`).

| Exigence du cahier | Dans le prototype |
|---|---|
| Tableau initialement vierge (F02) | Oui ; bouton « Charger l'exemple » pour la démonstration |
| Bibliothèque de modules en bandeau, rétractable, masquée en consultation (3.2) | Oui : 8 modules (6 de visualisation + Assistant + Notes) |
| Glisser-déposer depuis le bandeau + ajout au clic | Oui, sur les deux moteurs |
| Grille magnétique, sans chevauchement, zones fantômes (F03) | Oui (placeholder doré), vérifié : aucun chevauchement après déplacement, redimensionnement ou dépose |
| Déplacer, redimensionner, dupliquer, supprimer, plein écran, configurer (3.2) | Oui |
| Trois rendus adaptatifs selon les dimensions propres du module, **sans appel IA** (F04) | Oui : compact / standard / développé calculés d'après la taille en pixels du module (`bandFor`), affichée dans chaque cadre |
| Filtres globaux facultatifs, filtre local prioritaire et signalé, réinitialisation (F05, 3.3) | Oui |
| Plusieurs exemplaires d'un même module avec des filtres différents | Oui (testé) |
| Module préconfiguré, paramètres personnalisables et réinitialisables (F06) | Réglages et bouton « Réinitialiser » ; la préconfiguration depuis la requête viendra avec le moteur de veille |
| Mode Édition / Consultation (3.2) | Oui, verrouillage vérifié sur les deux moteurs |
| États vide / chargement / erreur / obsolète (3.2) | Oui, forçables depuis le panneau (« État simulé ») ; message « aucun résultat dans la collecte disponible », jamais « rien ne s'est passé » (5.3) |
| Sauvegarde automatique débouncée avec confirmation, restauration du dernier état fiable (3.2) | Oui (600 ms, « Enregistré à hh:mm:ss ») ; restauration exacte vérifiée au rechargement ; un enregistrement invalide est refusé et on repart du tableau vierge |
| Dispositions bureau / téléphone distinctes, tablette à valider (3.2) | **Trois dispositions indépendantes** (12, 6 et 1 colonnes) : modifier l'une ne déplace jamais les autres (testé) |
| Simulateur de largeur | Boutons Bureau / Tablette / Téléphone pour juger sans redimensionner la fenêtre |

Équivalents clavier et tactile : le panneau de configuration a des boutons ↑ ↓ ← → et Largeur ± / Hauteur ± (un pas à la fois, refusés s'ils sortiraient de la grille ou chevaucheraient un module). Aucune des deux bibliothèques ne permet de déplacer un module au clavier.

## 3. Comparatif mesuré

| Critère | GridStack 14.1.0 | React Grid Layout 2.3.0 |
|---|---|---|
| Licence | MIT | MIT |
| Poids JS minifié / gzip | 101,3 Ko / 29,0 Ko | 72,5 Ko / 23,6 Ko |
| CSS (gzip) | 2,9 Ko | 0,6 Ko + 0,6 Ko (`react-resizable`) |
| Dépendances d'exécution | aucune | 6 |
| Téléchargements npm (semaine du 2 au 8/11/2026) | 0,96 million | 6,18 millions |
| Intégration React | Wrapper officiel `gridstack/dist/react` (portails) ; GridStack crée le DOM, React rend le contenu | Composant React contrôlé par notre état |
| Notre code d'adaptateur | 145 lignes | 55 lignes |
| Déplacement, redimensionnement | Oui | Oui |
| Glisser-déposer depuis le bandeau | Oui, mécanisme propre à la souris (avec gestion du toucher intégrée, **non vérifiée ici**) | Oui, glisser-déposer natif du navigateur (**pas au doigt**) |
| Verrouillage en consultation | Oui (`setStatic`) | Oui (poignées retirées) |
| Mobile 1 colonne, dispositions distinctes | Oui, la grille est recréée à chaque changement de largeur | Oui, sans recréation |
| Poignée de redimensionnement | Coin bas-droit, **visible seulement au survol** par défaut (réglable) | Coin bas-droit, toujours visible |
| Animations | Transition de taille à l'insertion (les cases « grandissent » à l'apparition) ; réglable | Transition de position, plus discrète |
| React 19.2 / Next 16 en développement (StrictMode) | Fonctionne | Fonctionne |
| Fonctions que nous n'avons pas utilisées mais qui existent | sous-grilles, tailles selon le contenu, enregistrement JSON natif, plusieurs grilles | grille réactive native avec dispositions par largeur, compacteurs personnalisables |

## 4. Difficultés rencontrées, par moteur

**GridStack (cinq)** :
1. Par défaut il n'accepte en dépose que les éléments de classe `.grid-stack-item` ; il faut lui désigner les puces de la bibliothèque (`acceptWidgets: fonction`).
2. Il émet lui-même un événement `dragstart` sur la puce, que les gestionnaires React de glisser natif reçoivent sans `dataTransfer` : cela faisait **planter la page** tant qu'on branchait les mêmes gestionnaires sur les deux moteurs.
3. `grid.on(événement, fonction)` ne garde qu'**un seul** gestionnaire par événement : en brancher un de plus remplace celui du wrapper (le comportement change sans erreur).
4. L'événement `change` part **aussi** quand c'est nous qui modifions la grille : état et grille se renvoient la balle. Avec une disposition contenant un trou, la page a bouclé (« Maximum update depth exceeded ») et planté. Corrigé de deux façons, valables pour les deux moteurs : notre état est **toujours compacté**, et on n'écoute que la fin d'un glissement ou d'un redimensionnement.
5. La grille doit être **recréée** à chaque changement de nombre de colonnes (12 / 6 / 1) ; par construction, l'état interne non enregistré des modules (par exemple un texte de note en cours de saisie) est perdu à ce moment-là (non mesuré).

**React Grid Layout** : aucune difficulté d'intégration. Un point de conception : la dépose depuis le bandeau ne transmet pas le module glissé (le navigateur le cache pendant le survol) ; nous le mémorisons dans une référence au début du glissement.

## 5. Ce qui est indépendant du moteur (et réutilisable tel quel)

Tout ce qui compte est dans notre code, pas dans la bibliothèque : `lib/supervision/lab/` (modèle de disposition, placement, compactage, dispositions dérivées, états, filtres, sérialisation validée, rendu adaptatif, 17 tests) et l'interface `GridEngineProps`. **Changer de moteur plus tard coûte un fichier d'adaptateur**, pas une refonte : c'est la vraie assurance contre un mauvais choix.

## 6. Ce qui n'a pas été vérifié (à ne pas présumer)

- **Vrai téléphone et vrai écran tactile** : le navigateur d'essai émule la largeur mais envoie des clics de souris. Le glisser au doigt, le pincement et le défilement de page pendant un glissement sont à tester sur appareil, sur les deux moteurs.
- **Safari et Firefox** : seul Chromium a été utilisé.
- **Performance** avec 20 modules ou plus, et sur téléphone d'entrée de gamme : non mesurée (le navigateur d'essai suspend le dessin d'image quand il n'est pas au premier plan).
- **Accessibilité** au lecteur d'écran : non évaluée ; seule l'alternative clavier existe.
- **Viewport des téléphones** : le site calcule tout sur 980 px de large sur téléphone (`app/layout.tsx`). Ces pages le surchargent (`width: device-width`) pour montrer le vrai comportement mobile ; la vraie Supervision devra décider de la même chose.
- Seuils de rendu (compact < 300 px de large ou < 230 de haut ; développé ≥ 620 × 400) : **provisoires**, à régler à l'usage.

## 7. Écarts avec le cahier des charges (à valider)

1. **Tablette** : le cahier la dit « à valider » ; le prototype lui donne 6 colonnes et une disposition indépendante dérivée du bureau la première fois qu'on l'ouvre.
2. **Sauvegarde** : locale au navigateur dans ce prototype ; côté serveur (avec révision, conflits et dernière version fiable) au Lot 1/2 intégré.
3. **Panneau de configuration** : volet superposé et non latéral, pour ne jamais changer la largeur de la grille (ouvrir un module la faisait passer de 12 à 6 colonnes — constaté pendant les essais).
4. Pas de gestion des conflits de sauvegarde entre deux appareils (hors prototype).

## 8. Décisions attendues

- **D9 — Moteur de grille.** Valides-tu React Grid Layout 2 (recommandé), ou souhaites-tu d'abord un essai sur appareil tactile avant de trancher ?
- Pour la suite (Lot 1) : **D0** reste à exécuter de ton côté : création du second projet Supabase de préproduction (je ne crée aucun compte, ni ne manipule d'identifiants).
