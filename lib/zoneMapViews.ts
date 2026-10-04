export interface ZoneMapView {
  center: [number, number];
  zoom: number;
}

/**
 * Cadrage initial de la carte de la page Actualité, par zone, relevé sur les
 * cadrages choisis à l'écran (conteneur d'environ 1 200 x 400 px). Une zone
 * absente d'ici (Europe) se cadre automatiquement sur ses événements.
 */
export const ZONE_MAP_VIEWS: Record<string, ZoneMapView> = {
  afrique: { center: [6, 22], zoom: 4 },
  "moyen-orient": { center: [32, 43], zoom: 5 },
  indopacifique: { center: [22, 110], zoom: 5 },
  "amerique-du-sud": { center: [0, -47.5], zoom: 3 },
};
