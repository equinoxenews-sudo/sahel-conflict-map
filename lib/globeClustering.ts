// Regroupement des événements sur le globe : réglages et fonctions pures (sans Cesium), testées dans tests/globe-clustering.test.ts.
// Le regroupement lui-même est celui de Cesium (EntityCluster), calculé en espace écran : voir Globe3D.tsx.

/**
 * Fonction active hors production seulement : next.config.ts pose NEXT_PUBLIC_GLOBE_CLUSTERING à « 0 » dans un build Vercel de
 * production. En local et en Preview, la bascule « Points / Groupes » existe et « Groupes » est l'affichage par défaut.
 */
export const GLOBE_CLUSTERING_ENABLED = process.env.NEXT_PUBLIC_GLOBE_CLUSTERING !== "0";

export type EventMode = "points" | "groups";

export const DEFAULT_EVENT_MODE: EventMode = GLOBE_CLUSTERING_ENABLED ? "groups" : "points";

/** Distance à l'écran (pixels) sous laquelle deux marqueurs se regroupent. */
export const CLUSTER_PIXEL_RANGE = 46;
/** Nombre minimal d'événements voisins à l'écran pour former un groupe : en dessous, les points rouges restent individuels, comme avant. */
export const CLUSTER_MIN_SIZE = 5;
/** Un groupe dont tous les événements tiennent dans ce rayon (mètres) n'a plus rien à séparer en zoomant : on liste ses événements. */
export const COLOCATED_RADIUS_M = 500;

const MIN_DIAMETER = 26;
const MAX_DIAMETER = 42;

/** Diamètre du disque (pixels) : croît lentement avec le nombre d'événements, plafonné à 42 px (jamais de grosse bulle). */
export function clusterDiameter(count: number): number {
  const grown = MIN_DIAMETER + 4 * Math.log2(Math.max(count, 2) / 2);
  return Math.round(Math.min(MAX_DIAMETER, grown));
}

/**
 * Diamètre (pixels) du gros point rouge d'un groupe, par paliers de 5 événements : 5 → 26 px, 10 → 30, 15 → 32, 20 → 34, 25 → 35,
 * puis de plus en plus lentement jusqu'au plafond de 42 px. Moins de 5 événements : pas de groupe (0).
 */
export function clusterDotDiameter(count: number): number {
  if (count < CLUSTER_MIN_SIZE) return 0;
  return clusterDiameter(2 * Math.floor(count / 5));
}

/** Côté de l'image du point (disque et halo discret autour). */
export function clusterDotCanvasSize(diameter: number): number {
  return diameter + 2 * Math.round(diameter * 0.35);
}

const EARTH_RADIUS_M = 6_371_000;

/** Distance en mètres entre deux points (haversine). */
export function distanceMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Vrai si tous les points sont à moins de `radiusMeters` du premier : zoomer ne les séparera jamais. */
export function isColocated(points: { lat: number; lon: number }[], radiusMeters: number = COLOCATED_RADIUS_M): boolean {
  if (points.length < 2) return true;
  return points.every((point) => distanceMeters(points[0], point) <= radiusMeters);
}

/** Identifiants distincts, dans l'ordre : un événement porte deux marqueurs (point et anneau), il ne se compte qu'une fois. */
export function distinctIds(ids: (number | null | undefined)[]): number[] {
  const seen = new Set<number>();
  for (const id of ids) if (typeof id === "number") seen.add(id);
  return [...seen];
}
