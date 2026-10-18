export type LayerKey =
  | "risk"
  | "events"
  | "aircraft"
  | "satellites"
  | "vessels"
  | "cables"
  | "earthquakes"
  | "wildfires"
  | "storms"
  | "volcanoes"
  | "floods"
  | "launches"
  | "nightLights"
  | "dayNight";

export const LAYER_LABELS: Record<LayerKey, string> = {
  risk: "Pays en crise",
  events: "Événements analysés",
  aircraft: "Avions militaires",
  satellites: "Satellites",
  vessels: "Navires",
  cables: "Câbles sous-marins",
  earthquakes: "Séismes",
  wildfires: "Feux de forêt",
  storms: "Tempêtes",
  volcanoes: "Volcans",
  floods: "Inondations",
  launches: "Lancements",
  nightLights: "Lumières des villes",
  dayNight: "Jour / nuit",
};

export const LAYER_ORDER: LayerKey[] = [
  "risk",
  "events",
  "aircraft",
  "satellites",
  "vessels",
  "cables",
  "earthquakes",
  "wildfires",
  "storms",
  "volcanoes",
  "floods",
  "launches",
  "nightLights",
  "dayNight",
];

// Only "risk" (the country-crisis overlay) is on by default — it's the
// site's core pre-existing feature. Every live-data layer starts off so
// the globe isn't cluttered on first load.
export const LAYER_DEFAULTS: Record<LayerKey, boolean> = {
  risk: true,
  // Les articles géolocalisés des analystes : le cœur éditorial du site, visible d'emblée.
  events: true,
  aircraft: false,
  satellites: false,
  vessels: false,
  cables: false,
  earthquakes: false,
  wildfires: false,
  storms: false,
  volcanoes: false,
  floods: false,
  launches: false,
  // Réglage d'affichage (pas une donnée) : les lumières des villes côté nuit. Décochées,
  // le globe reste lisible de près, même la nuit.
  nightLights: true,
  // Réglage d'affichage : l'ombre de la nuit selon la position réelle du soleil. Décochée,
  // tout le globe est éclairé comme en plein jour (et les lumières des villes s'effacent).
  dayNight: true,
};

// The click-to-info-bubble payload attached to every globe entity (see
// Globe3D.tsx) — stored as a JSON string on the Cesium entity's
// `properties` bag and parsed back out on click, since PropertyBag
// values are meant to be simple/serializable, not arbitrary nested
// objects.
export interface EntityPopupField {
  label: string;
  value: string;
}

export interface EntityPopupData {
  layerKey: LayerKey;
  badge: string;
  title: string;
  fields: EntityPopupField[];
  /** Lien vers une page complète (article d'analyste, fiche de la source…). */
  href?: string;
  /** Texte du lien (« Lire l'article → » par défaut). */
  hrefLabel?: string;
  /** Liens complémentaires (sources externes). */
  links?: { label: string; href: string }[];
  /** Image d'illustration (photo, vue satellite du site). */
  imageUrl?: string;
}
