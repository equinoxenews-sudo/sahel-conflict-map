// Regroupement des événements sur le globe : réglages et fonctions pures (sans Cesium), testées dans tests/globe-clustering.test.ts.
// Le regroupement lui-même est celui de Cesium (EntityCluster), calculé en espace écran : voir Globe3D.tsx.

/**
 * Regroupement des événements : actif partout, « Groupes » est l'affichage par défaut, avec la bascule « Points / Groupes ».
 * Interrupteur d'urgence : NEXT_PUBLIC_GLOBE_CLUSTERING = « 0 » (variable Vercel, puis redéploiement) rend l'affichage historique.
 */
export const GLOBE_CLUSTERING_ENABLED = process.env.NEXT_PUBLIC_GLOBE_CLUSTERING !== "0";

/** Outils d'essai (événements synthétiques, accès au globe) : hors production seulement, voir next.config.ts. */
export const GLOBE_TEST_TOOLS = process.env.NEXT_PUBLIC_GLOBE_TEST_TOOLS === "1";

export type EventMode = "points" | "groups";

export const DEFAULT_EVENT_MODE: EventMode = GLOBE_CLUSTERING_ENABLED ? "groups" : "points";

/** Distance à l'écran (pixels) sous laquelle deux marqueurs se regroupent. */
export const CLUSTER_PIXEL_RANGE = 28;
/** Nombre minimal d'événements voisins à l'écran pour former un groupe : en dessous, les points rouges restent individuels, comme avant. */
export const CLUSTER_MIN_SIZE = 5;
/** Zoom proche : sous cette altitude (mètres) les groupes éclatent en points individuels, avec l'écart en couronne et l'anneau de main. */
export const EXPLODE_BELOW_M = 500_000;
/** Ils se regroupent de nouveau au-dessus de cette altitude (écart pour éviter les allers-retours autour du seuil). */
export const REGROUP_ABOVE_M = 700_000;

/** Regroupement ou éclatement selon l'altitude de la caméra, avec hystérésis. */
export function explodedAtHeight(currentlyExploded: boolean, heightMeters: number): boolean {
  return currentlyExploded ? heightMeters < REGROUP_ABOVE_M : heightMeters < EXPLODE_BELOW_M;
}

/** Un groupe dont tous les événements tiennent dans ce rayon (mètres) n'a plus rien à séparer en zoomant : on liste ses événements. */
export const COLOCATED_RADIUS_M = 500;

/** Taille (pixels) du point d'un groupe de 5 à 9 événements (un peu plus qu'un point rouge de main, environ 10), et plafond. */
const FIRST_DOT = 13;
const MAX_DOT = 28;

/**
 * Diamètre (pixels) du point rouge d'un groupe, par paliers de 5 événements : 5 → 13 px, 10 → 18, 15 → 20, 20 → 22, 25 → 23, puis de
 * plus en plus lentement jusqu'au plafond de 28 px. Moins de 5 événements : pas de groupe (0).
 */
export function clusterDotDiameter(count: number): number {
  if (count < CLUSTER_MIN_SIZE) return 0;
  const tier = Math.floor(count / 5);
  return Math.round(Math.min(MAX_DOT, FIRST_DOT + 4.5 * Math.log2(tier)));
}

/** Côté de l'image du point (disque et petit halo autour). */
export function clusterDotCanvasSize(diameter: number): number {
  return diameter + 2 * Math.round(diameter * 0.2);
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

// --- Style « anneaux » (essai, piste 2 de docs/PROPOSITIONS_POINTS_GLOBE.md) -------------------------------------------------------
// Un groupe devient un anneau creux avec un petit point plein au centre ; un événement isolé, un point plein net, sans halo ni reflet.
// Sur cette branche d'essai, les anneaux sont l'affichage par défaut ; ?points=disques rend l'ancien affichage (disques) pour comparer.

export type PointStyle = "disques" | "anneaux";

export const POINT_STYLE_PARAM = "points";

/** Style demandé par l'adresse : « ?points=disques » rend l'ancien affichage, tout le reste donne les anneaux. */
export function pointStyleFromSearch(search: string): PointStyle {
  return new URLSearchParams(search).get(POINT_STYLE_PARAM) === "disques" ? "disques" : "anneaux";
}

/** À partir de ce nombre d'événements, un second anneau très fin entoure le premier. */
export const RING_DOUBLE_FROM = 100;
const RING_FIRST = 20;
const RING_MAX = 48;
/** Marge (pixels) de l'image autour de l'anneau : place du second anneau et du lissage des bords. */
const RING_MARGIN = 8;
/** Écart (pixels) entre l'anneau et le second anneau. */
const RING_GAP = 6;

/**
 * Diamètre extérieur (pixels) de l'anneau d'un groupe : 5 événements → 20 px, 12 → 25, 30 → 31, 90 → 38, 260 → 44, puis plafond à 48.
 * Moins de 5 événements : pas de groupe (0).
 */
export function ringDiameter(count: number): number {
  if (count < CLUSTER_MIN_SIZE) return 0;
  return Math.round(Math.min(RING_MAX, RING_FIRST + 4.2 * Math.log2(count / CLUSTER_MIN_SIZE)));
}

/** Côté de l'image d'un anneau (diamètre, second anneau et marge). */
export function ringCanvasSize(diameter: number): number {
  return diameter + 2 * (RING_MARGIN + RING_GAP);
}

/** Durée d'un clignotement (lent) des points du style « anneaux », en millisecondes (le rythme d'origine des points d'événements). */
export const BLINK_MS = 2600;

/**
 * Opacité (de `floor` à 1) d'un point à l'instant `nowMs` : un battement lent et régulier. La phase propre à chaque point (0 à 1) évite
 * qu'ils ne clignotent tous ensemble.
 */
export function blinkLevel(nowMs: number, phase: number, floor = 0.35): number {
  const t = ((nowMs / BLINK_MS + phase) % 1) * 2 * Math.PI;
  return floor + (1 - floor) * (0.5 + 0.5 * Math.sin(t));
}
