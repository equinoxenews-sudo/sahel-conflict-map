import { COUNTRY_PROFILES_LIST } from "../countries";
import type { WorldGeoFeature } from "../worldGeo";
import { foldName } from "./geo";
import type { Zone } from "./model";

// Pays qui touchent la zone d'une veille : sert à écarter les publications SANS lieu qui parlent d'ailleurs (un article
// sur le JNIM au Mali ne concerne pas une veille du nord du Bénin). Une publication sans lieu n'est retenue que si son
// texte cite un de ces pays. Module pur : les fonds de carte sont fournis par l'appelant (lib/worldGeo.ts, côté serveur).

const KM_PER_DEG_LAT = 110.57;
const KM_PER_DEG_LON_EQUATOR = 111.32;
const toRad = (degrees: number) => (degrees * Math.PI) / 180;

type Ring = number[][];

/** Distance (km) d'un point au segment [a, b], par projection locale autour du point (suffisant à l'échelle d'une zone). */
function distanceToSegmentKm(lat: number, lon: number, a: number[], b: number[]): number {
  const kx = KM_PER_DEG_LON_EQUATOR * Math.cos(toRad(lat));
  const ax = (a[0] - lon) * kx;
  const ay = (a[1] - lat) * KM_PER_DEG_LAT;
  const bx = (b[0] - lon) * kx;
  const by = (b[1] - lat) * KM_PER_DEG_LAT;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSquared));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

function pointInRing(lat: number, lon: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function polygons(feature: WorldGeoFeature): Ring[][] {
  const geometry = feature.geometry;
  return geometry.type === "Polygon" ? [geometry.coordinates as Ring[]] : (geometry.coordinates as Ring[][]);
}

/** Le pays touche-t-il le cercle (centre à l'intérieur, ou frontière à moins du rayon) ? */
export function touchesCircle(feature: WorldGeoFeature, lat: number, lon: number, radiusKm: number): boolean {
  for (const polygon of polygons(feature)) {
    if (polygon[0] && pointInRing(lat, lon, polygon[0])) return true;
    for (const ring of polygon) {
      for (let i = 1; i < ring.length; i++) {
        if (distanceToSegmentKm(lat, lon, ring[i - 1], ring[i]) <= radiusKm) return true;
      }
    }
  }
  return false;
}

function wordsOf(feature: WorldGeoFeature): string[] {
  const words: string[] = [];
  if (feature.properties?.name) words.push(foldName(feature.properties.name));
  const french = COUNTRY_PROFILES_LIST.find((profile) => profile.iso3 === feature.id)?.name;
  if (french) words.push(foldName(french));
  return words.filter(Boolean);
}

/** Noms (français et anglais, normalisés) du ou des pays qui CONTIENNENT un point (le pays du centre d'une zone). */
export function homeCountryWords(features: readonly WorldGeoFeature[], lat: number, lon: number): Set<string> {
  const words = new Set<string>();
  for (const feature of features) {
    if (polygons(feature).some((polygon) => polygon[0] && pointInRing(lat, lon, polygon[0]))) wordsOf(feature).forEach((word) => words.add(word));
  }
  return words;
}

/** Noms (français et anglais, normalisés) des pays qui touchent un cercle. */
export function countryWordsNearCircle(features: readonly WorldGeoFeature[], lat: number, lon: number, radiusKm: number): Set<string> {
  const words = new Set<string>();
  for (const feature of features) {
    if (touchesCircle(feature, lat, lon, radiusKm)) wordsOf(feature).forEach((word) => words.add(word));
  }
  return words;
}

function displayNames(feature: WorldGeoFeature): string[] {
  const french = COUNTRY_PROFILES_LIST.find((profile) => profile.iso3 === feature.id)?.name;
  return [...new Set([french, feature.properties?.name].filter((name): name is string => Boolean(name)))];
}

/**
 * Noms (français puis anglais) du pays du centre d'un cercle et des pays voisins qui le touchent : base des requêtes de
 * recherche de presse. Un cercle sans pays sous son centre (en mer) range tous les pays touchés comme « pays du centre ».
 */
export function circleCountryNames(features: readonly WorldGeoFeature[], lat: number, lon: number, radiusKm: number): { home: string[]; neighbours: string[] } {
  const home: string[] = [];
  const neighbours: string[] = [];
  for (const feature of features) {
    const contains = polygons(feature).some((polygon) => polygon[0] && pointInRing(lat, lon, polygon[0]));
    if (contains) home.push(...displayNames(feature));
    else if (touchesCircle(feature, lat, lon, radiusKm)) neighbours.push(...displayNames(feature));
  }
  return home.length > 0 ? { home, neighbours } : { home: neighbours, neighbours: [] };
}

/** Mots de lieu qu'un texte sans coordonnées doit citer pour concerner la zone ; null si la zone ne peut pas les donner. */
export function placeWordsFor(zone: Zone, features: readonly WorldGeoFeature[], countriesZoneNames: Set<string> | undefined): Set<string> | null {
  if (zone.kind === "countries") return countriesZoneNames && countriesZoneNames.size > 0 ? countriesZoneNames : null;
  const words = countryWordsNearCircle(features, zone.lat, zone.lon, zone.radiusKm);
  return words.size > 0 ? words : null;
}
