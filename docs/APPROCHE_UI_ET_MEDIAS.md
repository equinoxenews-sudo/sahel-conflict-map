# Fiches pays « Approche » : choix d'interface et règles des médias

## Interface

- **Chiffres clés** (`KpiGrid`, `components/approche/shared.tsx`) : la disposition suit la largeur de la grille (requête de conteneur) et le nombre de tuiles. 6 → 3×2, 5 → 3+2 sur une rangée équilibrée, 4 → 2×2 (4×1 au-delà de 900 px), 3 → 3×1. Sur téléphone : 2 colonnes, la dernière tuile impaire occupe toute la largeur ; 1 colonne sous 300 px. Aucune tuile orpheline.
- **Valeurs** : jamais coupées au milieu d'un nombre ni d'un mot (`hyphens: none`, espaces insécables dans les milliers et avant « Md »). Montants au-delà de 1 000 Md affichés en milliards (« 3 366 Md $ US ») ; la valeur exacte et la méthode sont dans le volet de sources.
- **Panneaux voisins** : alignés en haut (`align-items: start`), jamais étirés à la hauteur du plus grand.
- **Téléphone** : le site déclare une largeur de page de 980 px (`app/layout.tsx`). Les pages `…/approche/pays/…` déclarent leur propre `viewport` (`device-width`) pour s'adapter à la largeur réelle de l'écran.
- **En-tête du pays** : synthèse repliée à trois lignes, « Lire la synthèse » la déplie (`aria-expanded`).
- **Détails** : tous les volets (sources d'un chiffre, relation, dossier, équipement, scénario…) sont des `<dialog>` natifs : Échap les ferme, le focus revient au bouton d'origine, ils restent dans l'écran et défilent en interne.
- **Cartes** : une seule implémentation (`ApprocheMap`), pilotée par les données : couches filtrables avec décompte, fiche au clic, marqueur sélectionné mis en évidence, liste synchronisée, recentrage, plein écran.

## Médias

Une image paraît en production seulement si `licenseStatus === "cleared"` **et** `commercialReuseAllowed === true` (`allowedInProduction`, `lib/approche/media.ts`). Sinon un visuel neutre s'affiche.

Garde-fou de construction (`scripts/approche-media-guard.ts`, lancé par `npm run build` via `prebuild`) :

- en production (`VERCEL_ENV=production`) : supprime `public/approche/demo/`, refuse la construction si une fiche réelle cite une image non autorisée ou si un fichier de `public/approche/` n'est pas déclaré comme autorisé ;
- en preview et en local : ne touche à rien.

Catalogue d'une image (`modules.media.assets`) : `id`, `path`, `alt`, `author`, `credit`, `sourceUrl`, `license`, `licenseUrl`, `licenseStatus`, `commercialReuseAllowed`, `attributionRequired`, `reviewedAt`, `focal`, `subject`.

Les trois photographies de démonstration (Paris, terminal à conteneurs, Rafale) sont en « licence à confirmer » : visibles en preview seulement. Le terminal à conteneurs est une illustration générique, jamais présentée comme un port français.
