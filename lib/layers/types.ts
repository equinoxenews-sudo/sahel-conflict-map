export type LayerKey =
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
