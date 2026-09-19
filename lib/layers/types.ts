export type LayerKey =
  | "risk"
  | "aircraft"
  | "satellites"
  | "vessels"
  | "earthquakes"
  | "wildfires"
  | "storms"
  | "volcanoes"
  | "floods"
  | "launches";

export const LAYER_LABELS: Record<LayerKey, string> = {
  risk: "Pays en crise",
  aircraft: "Avions militaires",
  satellites: "Satellites",
  vessels: "Navires",
  earthquakes: "Séismes",
  wildfires: "Feux de forêt",
  storms: "Tempêtes",
  volcanoes: "Volcans",
  floods: "Inondations",
  launches: "Lancements",
};

export const LAYER_ORDER: LayerKey[] = [
  "risk",
  "aircraft",
  "satellites",
  "vessels",
  "earthquakes",
  "wildfires",
  "storms",
  "volcanoes",
  "floods",
  "launches",
];

// Only "risk" (the country-crisis overlay) is on by default — it's the
// site's core pre-existing feature. Every live-data layer starts off so
// the globe isn't cluttered on first load.
export const LAYER_DEFAULTS: Record<LayerKey, boolean> = {
  risk: true,
  aircraft: false,
  satellites: false,
  vessels: false,
  earthquakes: false,
  wildfires: false,
  storms: false,
  volcanoes: false,
  floods: false,
  launches: false,
};
