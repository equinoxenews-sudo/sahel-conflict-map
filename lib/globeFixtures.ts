// Événements SYNTHÉTIQUES pour éprouver le regroupement du globe (densité, performance, points confondus) sans toucher aux données.
// Activés par l'adresse (?evenements-test=100|1000|5000) hors production seulement ; jamais écrits nulle part, jamais présentés
// comme réels : chaque titre le dit. Génération déterministe (mêmes événements à chaque chargement).
import type { AnalystEvent } from "./layers/analystRisk";

export const FIXTURE_PARAM = "evenements-test";
const ALLOWED = new Set([100, 1000, 5000]);

/** Foyers d'activité (centre, dispersion en degrés, poids) et capitales où plusieurs événements partagent exactement le même lieu. */
const HOTSPOTS: { zone: string; lat: number; lon: number; spread: number; weight: number }[] = [
  { zone: "europe", lat: 49, lon: 31, spread: 4, weight: 5 },
  { zone: "europe", lat: 48.8, lon: 2.3, spread: 3, weight: 3 },
  { zone: "moyen-orient", lat: 33, lon: 36, spread: 4, weight: 5 },
  { zone: "moyen-orient", lat: 31.5, lon: 34.5, spread: 1.2, weight: 3 },
  { zone: "afrique", lat: 13, lon: -2, spread: 5, weight: 5 },
  { zone: "afrique", lat: 0, lon: 25, spread: 6, weight: 3 },
  { zone: "afrique", lat: 15, lon: 32, spread: 3, weight: 2 },
  { zone: "indopacifique", lat: 23.5, lon: 121, spread: 3, weight: 2 },
  { zone: "indopacifique", lat: 21, lon: 96, spread: 4, weight: 2 },
  { zone: "amerique-du-sud", lat: 4.5, lon: -74, spread: 5, weight: 1 },
];
const CAPITALS = [
  { zone: "afrique", lat: 12.6392, lon: -8.0029, place: "Bamako", country: "Mali" },
  { zone: "afrique", lat: 12.3714, lon: -1.5197, place: "Ouagadougou", country: "Burkina Faso" },
  { zone: "europe", lat: 50.4501, lon: 30.5234, place: "Kiev", country: "Ukraine" },
  { zone: "moyen-orient", lat: 33.5138, lon: 36.2765, place: "Damas", country: "Syrie" },
];

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Nombre demandé par l'adresse (100, 1000 ou 5000), ou null. */
export function fixtureCountFromSearch(search: string): number | null {
  const raw = new URLSearchParams(search).get(FIXTURE_PARAM);
  const count = raw ? Number(raw) : Number.NaN;
  return ALLOWED.has(count) ? count : null;
}

export function syntheticEvents(count: number, now: number = Date.UTC(2026, 10, 2)): AnalystEvent[] {
  const next = random(20261102);
  const totalWeight = HOTSPOTS.reduce((sum, h) => sum + h.weight, 0);
  const out: AnalystEvent[] = [];
  for (let i = 0; i < count; i++) {
    // Un événement sur dix partage exactement le lieu d'une capitale (cas des points confondus).
    const capital = next() < 0.1 ? CAPITALS[Math.floor(next() * CAPITALS.length)] : null;
    let zone: string;
    let lat: number;
    let lon: number;
    if (capital) {
      ({ zone, lat, lon } = capital);
    } else {
      let pick = next() * totalWeight;
      const hot = HOTSPOTS.find((h) => (pick -= h.weight) < 0) ?? HOTSPOTS[0];
      zone = hot.zone;
      // Dispersion approximativement gaussienne autour du foyer.
      lat = hot.lat + (next() + next() + next() - 1.5) * hot.spread;
      lon = hot.lon + (next() + next() + next() - 1.5) * hot.spread * 1.3;
    }
    out.push({
      id: 9_000_000 + i,
      zone,
      title: `Événement de test n° ${i + 1} (donnée synthétique)`,
      publishedAt: new Date(now - next() * 30 * 86_400_000).toISOString(),
      lat: Math.max(-85, Math.min(85, lat)),
      lon,
      place: capital?.place ?? null,
      country: capital?.country ?? null,
      confidence: null,
      confidenceLabel: null,
      claimedBy: null,
      importance: next() < 0.12 ? "high" : "medium",
      theme: null,
      eventType: null,
      precision: capital ? "capitale" : "ville",
      imageUrl: null,
    });
  }
  return out;
}
