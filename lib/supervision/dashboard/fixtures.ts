// Prototype du Lot 2 : données ENTIÈREMENT FICTIVES. Aucun fait, lieu ni média réel : chaque titre porte la mention « [DÉMO] »
// et les positions sont des coordonnées abstraites (0 à 100) sur un fond schématique, jamais de vraies latitudes/longitudes.

import type { Filters, Theme } from "./state";

export type Priority = "information" | "importante" | "critique";
export type Verification = "signalement" | "corrobore" | "conteste" | "confirme";

export interface BoardEvent {
  /** Texte : « a-123 » (article), « e-456 » (signalement médiatique) ; « 7 » pour les données fictives du prototype. */
  id: string;
  /** Absent pour les données fictives du prototype. */
  kind?: "article" | "signal";
  title: string;
  summary?: string;
  theme: Exclude<Theme, "all">;
  priority: Priority;
  verification: Verification;
  /** Date des faits ou de publication (ISO). */
  at: string;
  /** Position abstraite sur la carte schématique (0 à 100) : données fictives du prototype seulement. */
  x?: number;
  y?: number;
  /** Coordonnées réelles : données réelles seulement. */
  lat?: number;
  lon?: number;
  place: string;
  /** Nombre de publications distinctes rattachées (jamais un indice de véracité). */
  publications: number;
  url?: string;
  domains?: string[];
}

/** Ancien nom, gardé pour le prototype. */
export type FakeEvent = BoardEvent;

const THEME_KEYS: FakeEvent["theme"][] = ["conflits", "securite", "politique", "humanitaire"];
const PRIORITIES: Priority[] = ["information", "importante", "information", "critique", "information", "importante"];
const VERIFICATIONS: Verification[] = ["signalement", "corrobore", "signalement", "confirme", "conteste", "signalement"];
const PLACES = ["Zone fictive Alpha", "Zone fictive Bravo", "Zone fictive Charlie", "Zone fictive Delta", "Zone fictive Écho"];

/** 48 événements fictifs répartis sur 90 jours, toujours les mêmes pour une date donnée (générateur déterministe). */
export function fakeEvents(now: number): FakeEvent[] {
  const out: FakeEvent[] = [];
  let seed = 7;
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let i = 0; i < 48; i++) {
    const ageDays = Math.floor(next() * next() * 90 * 1.6) % 90;
    out.push({
      id: String(i + 1),
      title: `[DÉMO] Événement fictif n° ${i + 1}`,
      theme: THEME_KEYS[i % THEME_KEYS.length],
      priority: PRIORITIES[i % PRIORITIES.length],
      verification: VERIFICATIONS[(i * 5) % VERIFICATIONS.length],
      at: new Date(now - ageDays * 86_400_000 - Math.floor(next() * 20) * 3_600_000).toISOString(),
      x: Math.round(8 + next() * 84),
      y: Math.round(8 + next() * 84),
      place: PLACES[i % PLACES.length],
      publications: 1 + Math.floor(next() * 5),
    });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

export function applyFilters(events: readonly FakeEvent[], filters: Filters, now: number): FakeEvent[] {
  const since = now - filters.periodDays * 86_400_000;
  return events.filter((e) => Date.parse(e.at) >= since && (filters.theme === "all" || e.theme === filters.theme));
}

export const PRIORITY_LABELS: Record<Priority, string> = { information: "Information", importante: "Importante", critique: "Critique" };
export const VERIFICATION_LABELS: Record<Verification, string> = { signalement: "Signalement", corrobore: "Corroboré", conteste: "Contesté", confirme: "Confirmé" };
