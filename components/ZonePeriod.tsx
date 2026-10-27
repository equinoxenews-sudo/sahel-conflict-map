"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type Period = "all" | "day" | "week" | "month" | "quarter";

export const PERIODS: { value: Period; label: string; days: number | null }[] = [
  { value: "all", label: "Toute la période (3 mois)", days: null },
  { value: "day", label: "24 dernières heures", days: 1 },
  { value: "week", label: "7 derniers jours", days: 7 },
  { value: "month", label: "30 derniers jours", days: 30 },
];

/** Période affichée à l'ouverture d'une zone : la liste des synthèses et la carte montrent la dernière semaine. */
export const DEFAULT_PERIOD: Period = "week";

interface ZonePeriodValue {
  period: Period;
  setPeriod: (period: Period) => void;
  /** Instant pris une fois à l'ouverture de la page (un rendu pur ne lit pas l'horloge). */
  now: number;
}

const ZonePeriodContext = createContext<ZonePeriodValue | null>(null);

// La période choisie dans la liste des synthèses d'une zone sert aussi à la carte : les deux montrent les mêmes
// articles. Entoure la liste et la carte dans la page de la zone.
export function ZonePeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);
  const [now] = useState(() => Date.now());
  return <ZonePeriodContext.Provider value={{ period, setPeriod, now }}>{children}</ZonePeriodContext.Provider>;
}

export function useZonePeriod(): ZonePeriodValue {
  const value = useContext(ZonePeriodContext);
  if (!value) throw new Error("useZonePeriod doit être utilisé dans un ZonePeriodProvider");
  return value;
}

/** Date de parution la plus ancienne retenue pour la période (null : pas de limite). */
export function periodCutoff(period: Period, now: number): number | null {
  const days = PERIODS.find((p) => p.value === period)?.days ?? null;
  return days === null ? null : now - days * 86400000;
}
