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
}
