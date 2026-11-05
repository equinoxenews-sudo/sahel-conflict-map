import raw from "@/data/world-indicators.json";

// Indicateurs chiffrés de tous les pays (Banque mondiale), produits par scripts/sync-world-indicators.ts. Servent au panneau pays du
// globe et à l'indice de puissance Équinoxe (lib/powerIndex.ts). Valeur la plus récente de chaque série, avec son année.

export type WorldIndicatorKey = "population" | "area" | "gdp" | "military";

export interface WorldIndicatorValue {
  value: number;
  year: number;
}

export type CountryWorldIndicators = Partial<Record<WorldIndicatorKey, WorldIndicatorValue>>;

export interface WorldIndicatorsFile {
  source: string;
  fetchedAt: string;
  countries: Record<string, CountryWorldIndicators>;
}

const FILE = raw as WorldIndicatorsFile;

export const WORLD_INDICATORS: Record<string, CountryWorldIndicators> = FILE.countries;
export const WORLD_INDICATORS_SOURCE = FILE.source;
export const WORLD_INDICATORS_FETCHED_AT = FILE.fetchedAt;

const NUMBER = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/** « 37,9 M », « 1,4 Md » : population en millions ou milliards d'habitants. */
export function formatPopulation(value: number): string {
  if (value >= 1e9) return `${NUMBER.format(value / 1e9)} Md`;
  if (value >= 1e6) return `${NUMBER.format(value / 1e6)} M`;
  if (value >= 1e3) return `${NUMBER.format(value / 1e3)} k`;
  return NUMBER.format(value);
}

/** « 1,2 billion $ » : en français, mille milliards = billion ; on écrit donc « Md $ » et « T$ » pour éviter l'ambiguïté. */
export function formatUsd(value: number): string {
  if (value >= 1e12) return `${NUMBER.format(value / 1e12)} T$`;
  if (value >= 1e9) return `${NUMBER.format(value / 1e9)} Md$`;
  if (value >= 1e6) return `${NUMBER.format(value / 1e6)} M$`;
  return `${NUMBER.format(value)} $`;
}

export function formatArea(value: number): string {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} km²`;
}
