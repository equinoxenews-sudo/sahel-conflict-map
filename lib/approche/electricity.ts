import { ELECTRICITY_ALIASES, ELECTRICITY_KEYS } from "./keys";
import type { MetricView } from "./view";

// Électricité par millésime. Une mesure d'un autre exercice porte la clé `energy.electricity.<clé>_<AAAA>` ; sans suffixe, la clé garde
// l'année de sa période de référence. Chaque millésime est complet par lui-même : une valeur absente en 2025 n'est jamais complétée par
// celle de 2024, et deux années ne sont jamais mélangées dans un même graphique.

const PREFIX = "energy.electricity.";

export interface ElectricityVintage {
  year: string;
  /** Mesures de ce millésime, par clé de base (`production_total`, `nuclear`…). */
  metrics: Record<string, MetricView>;
}

/** Clé de base et année d'une clé d'électricité, ou null si ce n'est pas une mesure d'électricité connue. */
export function electricityKeyParts(key: string, period: string): { base: string; year: string } | null {
  if (!key.startsWith(PREFIX)) return null;
  const leaf = key.slice(PREFIX.length);
  const suffixed = leaf.match(/^(.+)_(\d{4})$/);
  const rawBase = suffixed ? suffixed[1] : leaf;
  const base = ELECTRICITY_ALIASES[rawBase] ?? rawBase;
  if (!(ELECTRICITY_KEYS as readonly string[]).includes(base)) return null;
  const year = suffixed ? suffixed[2] : period.match(/^\d{4}/)?.[0];
  return year ? { base, year } : null;
}

/** Millésimes disponibles, du plus récent au plus ancien. */
export function electricityVintages(metrics: Map<string, MetricView>): ElectricityVintage[] {
  const byYear = new Map<string, Record<string, MetricView>>();
  for (const metric of metrics.values()) {
    const parts = electricityKeyParts(metric.key, metric.period);
    if (!parts) continue;
    const entry = byYear.get(parts.year) ?? {};
    if (!entry[parts.base]) entry[parts.base] = metric;
    byYear.set(parts.year, entry);
  }
  return [...byYear].sort((a, b) => b[0].localeCompare(a[0])).map(([year, entry]) => ({ year, metrics: entry }));
}

const COLORS = { nuclear: "#9b6be8", hydro: "#3d9be9", windsolar: "#35b779", otherren: "#6fd3a8", fossil: "#e87932", rest: "#8f9baa" };

export interface ProductionSegment {
  id: string;
  label: string;
  value: number;
  color: string;
  calc: boolean;
}

/** Parts de l'électricité produite : valeurs de la source, et deux parts CALCULÉES (autres renouvelables, écart non détaillé) signalées comme telles. */
export function productionSegments(vintage: ElectricityVintage): { total: number; segments: ProductionSegment[] } | null {
  const raw = (key: string) => vintage.metrics[key]?.raw ?? null;
  const total = raw("production_total");
  const nuclear = raw("nuclear");
  const renewable = raw("renewable");
  const hydro = raw("hydro");
  const windSolar = raw("wind_solar");
  const fossil = raw("fossil");
  // Seule la production totale est indispensable : une filière absente du fichier n'est ni affichée ni comptée comme nulle ; ce qui
  // n'est pas détaillé apparaît dans « Non détaillé » (calculé).
  if (total === null) return null;
  // Autres renouvelables = renouvelables moins hydraulique moins éolien-solaire, seulement si les trois sont publiés.
  const otherRenewable = renewable !== null && hydro !== null && windSolar !== null ? Math.max(renewable - hydro - windSolar, 0) : 0;
  const renewableCovered = renewable ?? (hydro ?? 0) + (windSolar ?? 0);
  const rest = Math.max(total - (nuclear ?? 0) - renewableCovered - (fossil ?? 0), 0);
  const segments: ProductionSegment[] = [
    { id: "nuclear", label: "Nucléaire", value: nuclear ?? 0, color: COLORS.nuclear, calc: false },
    { id: "hydro", label: "Hydraulique", value: hydro ?? 0, color: COLORS.hydro, calc: false },
    { id: "windsolar", label: "Éolien et solaire", value: windSolar ?? 0, color: COLORS.windsolar, calc: false },
    { id: "otherren", label: "Autres renouvelables (calculé)", value: otherRenewable, color: COLORS.otherren, calc: true },
    { id: "fossil", label: "Origine fossile", value: fossil ?? 0, color: COLORS.fossil, calc: false },
    { id: "rest", label: "Non détaillé (écart de la source, calculé)", value: rest, color: COLORS.rest, calc: true },
  ].filter((segment) => segment.value > 0.05);
  return { total, segments };
}
