# Points du globe : cinq pistes à visualiser (cahier des charges pour infographie)

Document à donner à un générateur d'images pour produire cinq maquettes comparables. Rien n'est codé : ce sont des intentions, décrites pour qu'on puisse les voir côte à côte avant de choisir.

## 1. Le problème

Sur le globe d'accueil d'Équinoxe News, chaque événement analysé est un point rouge. Quand beaucoup d'événements sont proches, ils sont regroupés en un **gros disque rouge plein**, d'autant plus grand que le groupe est gros. Défauts constatés :

- les gros disques **recouvrent les pays, les frontières et les noms** ;
- le disque a un **reflet rose au centre** et un halo flou : l'effet est celui d'une bille plastique, pas d'une carte de renseignement ;
- la taille grandit sans limite avec le nombre d'événements, donc les zones les plus chaudes sont les plus illisibles ;
- les groupes se touchent et forment des grappes de bulles.

À conserver quoi qu'il arrive : un clic sur un point ou un groupe doit toujours ouvrir l'événement ou zoomer ; la couleur de référence des événements est le rouge `#ff3b30` ; l'identité visuelle du site (fond bleu nuit, or, hexagones) ; pas de chiffres sur les groupes, sauf mention contraire ci-dessous.

## 2. Décor commun aux cinq maquettes (identique partout)

Pour que la comparaison soit honnête, **les cinq images montrent exactement la même scène** :

- **Cadrage :** vue du globe centrée sur l'Afrique du Nord et de l'Ouest, avec l'Europe du Sud en haut et le Moyen-Orient à droite (comme la capture de référence : Maroc, Algérie, Mauritanie, Mali, Niger, Tchad, Soudan, Libye, Égypte, péninsule arabique visibles).
- **Fond :** imagerie satellite sombre côté nuit, plus claire côté jour, avec un dégradé jour/nuit net à droite. Frontières blanches fines et noms de pays en petites capitales grises.
- **Teinte des pays :** certains pays sont teintés selon leur niveau d'alerte, à 25 % d'opacité : **critique** rouge `#d94a4a` (Mali, Soudan, Yémen), **danger** orange `#e87932` (Niger, Burkina Faso, Éthiopie), **à surveiller** jaune `#e0b44c` (Nigeria, Cameroun). Les autres pays ne sont pas teintés.
- **Données fictives identiques :**
  - 14 événements isolés (1 événement chacun), répartis au hasard dont 3 sur l'Ukraine/Europe de l'Est, 4 au Sahel, 3 au Moyen-Orient, 4 ailleurs ;
  - 7 groupes de **2, 5, 12, 30, 90, 260 et 640 événements** : le 640 sur le Soudan/Khartoum, le 260 sur la région de Gao (Mali), le 90 sur Alger–Tunis, le 30 sur Bamako, le 12 sur Le Caire, le 5 sur Niamey, le 2 sur Lagos ;
  - **1 événement d'importance haute** (au Soudan) qui a, en plus, un anneau d'onde (« radar ») fin et discret autour de son point.
- **Légende en bas à droite**, à la même place sur les cinq images, expliquant le principe de la piste.
- **Titre de l'image** en haut à gauche, hors du globe : « Piste N — nom ». Format 1600 × 1000 px.

Palette de référence du site :

| Usage | Couleur |
|---|---|
| Rouge des événements | `#ff3b30` |
| Reflet actuel (à supprimer) | `#ff8a80` |
| Or du site | `#c89b3c` (clair `#e0b44c`) |
| Fond de panneau | `#0c1726` |
| Texte | `#f1f4f7`, secondaire `#8f9baa` |
| Critique / danger / à surveiller | `#d94a4a` / `#e87932` / `#e0b44c` |

## 3. Référence : l'état actuel (à produire aussi, en petit, pour comparer)

Une sixième vignette « Aujourd'hui » : mêmes données, points isolés = petits disques rouges de 8 à 10 px avec halo serré ; groupes = disques rouges pleins de 14 px (2 événements) à 70 px et plus (640 événements), halo flou, reflet rose au centre. Elle sert uniquement de point de comparaison.

---

## Piste 1 — Plafonner et adoucir

**Idée :** on garde des disques, mais ils cessent de grossir sans limite et deviennent translucides, comme du verre teinté. C'est le correctif minimal.

**Aspect :**
- Disque rouge `#ff3b30` à **45 % d'opacité**, avec un **liseré net de 1,5 px** en rouge plein `#ff3b30` à 100 %.
- **Plus de reflet rose, plus de halo flou.** Un disque propre, bord franc.
- Les frontières et les noms de pays restent **visibles à travers** le disque.

**Taille (diamètre à l'écran, en pixels), croissance logarithmique avec plafond :**

| Événements dans le groupe | Diamètre |
|---|---|
| 1 (point isolé) | 9 |
| 2 | 12 |
| 5 | 15 |
| 12 | 18 |
| 30 | 21 |
| 90 | 25 |
| 260 | 26 (plafond) |
| 640 | 26 (plafond) |

**Comportement :** au survol, le liseré passe à l'or `#e0b44c` ; au clic, zoom sur le groupe. Pas de chiffre.

**Légende :** « La taille indique le nombre d'événements (plafonnée). » avec trois disques d'exemple (petit, moyen, plafond) et la mention « 1 · 12 · 100 et plus ».

**Avantages :** très simple, risque faible. **Limite :** les groupes très différents (90 et 640) se ressemblent.

---

## Piste 2 — Anneaux

**Idée :** un groupe devient un **anneau creux** avec un petit point plein au centre. L'anneau indique le volume sans rien cacher : la carte reste lisible dedans.

**Aspect :**
- Anneau de **2 px** en rouge `#ff3b30` plein ; l'intérieur de l'anneau est rempli à **10 %** seulement (presque transparent).
- **Petit point central plein** rouge de 6 px, avec un fin contour sombre `#0c1726` d'1 px pour rester net.
- **Aucun halo, aucun reflet.**
- Les points isolés sont de simples points pleins de 8 px, sans anneau.
- Pour les gros groupes (plus de 100), un **second anneau très fin** (1 px, 35 % d'opacité) à 6 px à l'extérieur du premier, comme une onde figée.

**Taille (diamètre extérieur de l'anneau) :**

| Événements | Diamètre |
|---|---|
| 1 | 8 (point plein, sans anneau) |
| 2 | 16 |
| 5 | 20 |
| 12 | 26 |
| 30 | 32 |
| 90 | 38 |
| 260 | 44 |
| 640 | 48 + second anneau |

**Comportement :** au survol, l'anneau passe à l'or ; au clic, zoom. L'événement d'importance haute garde son onde animée, à part.

**Légende :** « Un anneau = un groupe d'événements ; plus il est large, plus il y en a. Un point plein = un événement isolé. »

**Avantages :** sobre, lisible, aspect « carte de renseignement ». **Limite :** à grande taille, deux anneaux voisins se croisent.

---

## Piste 3 — La couleur dit l'intensité, pas la taille

**Idée :** tous les groupes ont à peu près la même taille ; c'est la **couleur** qui dit combien il y en a, du jaune (peu) au rouge sombre (beaucoup). Plus aucun gros disque.

**Aspect :** disque à **55 % d'opacité**, liseré blanc de 1 px à 60 %, sans halo ni reflet. Taille quasi constante, entre 12 et 22 px.

**Échelle de couleur (5 niveaux) et taille :**

| Événements | Couleur | Diamètre |
|---|---|---|
| 1 | jaune `#e0b44c` | 9 |
| 2 à 9 | ambre `#f0a030` | 13 |
| 10 à 29 | orange `#e87932` | 16 |
| 30 à 99 | rouge-orangé `#e8503a` | 19 |
| 100 et plus | rouge profond `#c4271c` | 22 |

**Attention :** ces couleurs ressemblent à celles des niveaux d'alerte des pays (jaune, orange, rouge). Sur la maquette, montrer le choix : soit on accepte la ressemblance, soit on la distingue par un liseré blanc seulement sur les groupes. Dessiner la version avec liseré blanc.

**Comportement :** survol = le disque grossit de 2 px ; clic = zoom.

**Légende :** une barre de dégradé horizontale « 1 → 100+ événements » aux cinq couleurs, avec les repères 1, 10, 30, 100.

**Avantages :** supprime le problème de taille. **Limite :** plus de couleurs à lire, et risque de confusion avec les teintes de pays.

---

## Piste 4 — Cellules hexagonales

**Idée :** au lieu de bulles, des **hexagones** translucides posés sur la carte, plus ou moins foncés selon le nombre d'événements. Ça reprend l'identité hexagonale du site (drapeaux hexagonaux). Quand on zoome, les cellules se subdivisent jusqu'aux points individuels.

**Aspect :**
- Hexagones **« pointe en haut »** (même forme que le drapeau hexagonal du site : sommet en haut et en bas, deux côtés verticaux).
- Pavage régulier sans chevauchement ; **seules les cellules contenant au moins un événement sont dessinées**.
- Taille d'une cellule en vue globale : **44 px de sommet à sommet**. En zoomant, chaque niveau de zoom divise la taille par deux, jusqu'à 11 px, puis on bascule sur des points individuels.
- Remplissage : rouge `#ff3b30` dont **l'opacité varie de 18 % (1 événement) à 75 % (100 et plus)** selon une échelle en palier (1, 2–9, 10–29, 30–99, 100+).
- Contour : **or `#c89b3c` à 60 %, 1 px**.
- **Pas de chiffre** dans les cellules (variante : montrer le nombre en blanc, 11 px, sur les cellules de 30 événements ou plus ; dessiner une petite variante en coin).
- Un événement isolé reste un petit point rouge dans sa cellule, pas un hexagone.

**Comportement :** survol = contour or à 100 % et cellule légèrement plus claire ; clic = zoom sur la cellule, qui se redécoupe.

**Légende :** cinq petits hexagones du plus clair au plus foncé, étiquetés « 1 · 2–9 · 10–29 · 30–99 · 100+ événements ».

**Avantages :** très distinctif, cohérent avec la marque, rien ne déborde, lecture immédiate des zones chaudes. **Limite :** le plus de travail ; l'alignement des cellules sur un globe demande de la rigueur.

---

## Piste 5 — Carte de chaleur douce

**Idée :** plus de bulles du tout en vue d'ensemble : une **lueur diffuse** là où il y a beaucoup d'événements, comme une carte de chaleur. Les points individuels n'apparaissent qu'en zoomant.

**Aspect :**
- Nuage de chaleur à noyau gaussien d'environ **40 px de rayon** par événement, l'intensité s'additionnant quand les événements se superposent.
- Dégradé du plus faible au plus fort : transparent → rouge sombre `#7a0f0a` (à 30 % d'opacité) → rouge `#d94a4a` → orange `#ff8a3c` → jaune clair `#ffd166` au cœur des zones les plus denses. Opacité maximale 75 %.
- Les frontières et noms de pays restent visibles sous la lueur.
- **Les événements isolés ou peu nombreux** (zones sans concentration) sont de petits points rouges de 6 px avec un halo d'1 px, visibles même en vue d'ensemble.
- À fort zoom, la lueur s'estompe et chaque événement redevient un point individuel de 9 px.

**Comportement :** survol = une bulle d'information « N événements dans cette zone » ; clic = zoom progressif.

**Légende :** une barre de dégradé « peu → beaucoup d'événements », plus la mention « Zoomez pour voir chaque événement ».

**Avantages :** très esthétique en vue d'ensemble, aucun gros disque. **Limite :** moins précis pour compter ou cliquer ; l'effet peut gommer des petits foyers isolés.

---

## 4. Ce que doit livrer l'infographie

1. **Six images** (« Aujourd'hui » + pistes 1 à 5), 1600 × 1000 px, même cadrage, même décor, mêmes données fictives (section 2).
2. Sur chaque image : le titre « Piste N — nom », la légende en bas à droite, et **une règle des tailles** sous la légende (les diamètres du tableau de la piste, dessinés à l'échelle).
3. **Une planche comparative** : les six vignettes côte à côte en 3 × 2, avec en dessous une ligne par piste : « Lisibilité de la carte : ★★★★☆ — Effet visuel : ★★★☆☆ — Simplicité : ★★★★★ » (c'est une première impression visuelle, à discuter).
4. **Un zoom sur la piste 4** à trois niveaux (vue globale, régionale, locale) pour montrer la subdivision des cellules, et **un zoom sur la piste 5** avec le passage de la lueur aux points individuels.
5. Rien d'autre sur la carte que ce qui est décrit ; pas de logo, pas d'interface autour du globe.

## 5. Question à trancher avec l'infographie

Les chiffres sur les groupes avaient été retirés à la demande du 18 octobre. Faut-il les remettre **uniquement sur les gros groupes** (par exemple 30 événements et plus), en petit, blanc, centré ? À regarder sur les pistes 1, 2 et 4.

## 6. Ma recommandation avant de voir les images

Les pistes **2 et 3 combinées** (anneaux, avec la couleur qui monte du jaune au rouge) donnent le meilleur résultat pour un coût faible. La piste **4** est la plus belle et la plus à notre image si on accepte un peu plus de travail. La piste **5** est un excellent complément en vue d'ensemble, mais pas pour remplacer les points.
