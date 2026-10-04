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

/**
 * Emprise de la carte « Pays & territoires » de la page Approche, par zone
 * ([[sud, ouest], [nord, est]]). Explicite plutôt que déduite des pays : la
 * Russie s'étend jusqu'à l'antiméridien et dézoomerait toute l'Europe.
 */
export const ZONE_APPROCHE_BOUNDS: Record<string, [[number, number], [number, number]]> = {
  europe: [[34, -25], [71, 45]],
  afrique: [[-35, -18], [37, 52]],
  "moyen-orient": [[12, 24], [42, 64]],
  indopacifique: [[-11, 60], [50, 150]],
  "amerique-du-sud": [[-56, -83], [13, -34]],
};
