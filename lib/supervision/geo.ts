import { FLAG_COUNTRIES } from "../countryFlagIndex";
import type { Zone } from "./model";

// Géométrie d'une zone de veille : distance, appartenance à un cercle ou à des pays. Module pur.

const EARTH_RADIUS_KM = 6371;
const toRad = (degrees: number) => (degrees * Math.PI) / 180;

/** Distance à vol d'oiseau entre deux points, en kilomètres (formule de haversine). */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Nom normalisé (minuscules, sans accents ni ponctuation) pour comparer des noms de pays. */
export function foldName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Noms français des pays d'une zone « pays » (d'après l'index des drapeaux), normalisés. */
export function countryNames(codes: readonly string[]): Set<string> {
  const wanted = new Set(codes.map((code) => code.toUpperCase()));
  return new Set(FLAG_COUNTRIES.filter((country) => wanted.has(country.iso2)).map((country) => foldName(country.name)));
}

export type ZoneVerdict =
  | { inside: true; distanceKm: number | null }
  | { inside: false };

export interface Place {
  latitude: number | null;
  longitude: number | null;
  /** Nom du pays, tel qu'enregistré avec l'élément (français ou anglais). */
  country?: string | null;
}

/**
 * Un lieu est-il dans la zone ? Un cercle se juge sur les coordonnées ; une zone « pays » sur le nom du pays, ou à défaut
 * sur les coordonnées qui ne peuvent pas la contredire (on ne devine pas un pays à partir d'un point). Un élément sans
 * lieu n'est jamais « dans la zone » : l'appelant décide quoi en faire.
 */
export function inZone(zone: Zone, place: Place, names?: Set<string>): ZoneVerdict {
  if (zone.kind === "circle") {
    if (place.latitude == null || place.longitude == null) return { inside: false };
    const km = distanceKm(zone.lat, zone.lon, place.latitude, place.longitude);
    return km <= zone.radiusKm ? { inside: true, distanceKm: Math.round(km) } : { inside: false };
  }
  const wanted = names ?? countryNames(zone.codes);
  if (place.country && wanted.has(foldName(place.country))) return { inside: true, distanceKm: null };
  return { inside: false };
}
