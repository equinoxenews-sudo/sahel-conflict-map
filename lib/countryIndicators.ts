// Indicateurs chiffrés des fiches pays (Banque mondiale) : mise en forme française
// et fusion avec le lot de la zone. Module pur, sans accès réseau (la récupération
// est dans scripts/sync-country-indicators.ts).

export interface IndicatorValue {
  value: number;
  /** Année de référence de la dernière valeur disponible. */
  year: number;
}

export type IndicatorKey = "population" | "area" | "gdp" | "growth" | "inflation";

export type CountryIndicators = Partial<Record<IndicatorKey, IndicatorValue>>;

export interface IndicatorsFile {
  source: string;
  fetchedAt: string;
  countries: Record<string, CountryIndicators>;
}

/** Champs de fiche alimentés par les indicateurs. */
export interface IndicatorFields {
  population?: string;
  area?: string;
  economy?: { gdp?: string; growth?: string; inflation?: string };
}

const number = (value: number, maximumFractionDigits: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits, minimumFractionDigits: 0 }).format(value);

// Les espaces insécables de Intl (U+202F, U+00A0) deviennent des espaces normaux : le texte reste simple à copier.
const plain = (text: string) => text.replace(/[  ]/g, " ");

const withYear = (text: string, year: number) => `${plain(text)} (${year})`;

export function formatPopulation({ value, year }: IndicatorValue): string {
  if (value >= 1_000_000) return withYear(`${number(value / 1_000_000, 1)} millions`, year);
  return withYear(number(Math.round(value / 1000) * 1000, 0), year);
}

export function formatArea({ value, year }: IndicatorValue): string {
  return withYear(`${number(Math.round(value), 0)} km²`, year);
}

export function formatGdp({ value, year }: IndicatorValue): string {
  if (value >= 1e9) return withYear(`${number(value / 1e9, value >= 1e11 ? 0 : 1)} Md USD`, year);
  return withYear(`${number(value / 1e6, 0)} M USD`, year);
}

export function formatPercent({ value, year }: IndicatorValue, signed: boolean): string {
  const sign = signed && value > 0 ? "+" : "";
  return withYear(`${sign}${number(value, 1)} %`, year);
}

/** Champs de fiche tirés des indicateurs d'un pays (un indicateur absent reste absent). */
export function indicatorFields(indicators: CountryIndicators | undefined): IndicatorFields {
  if (!indicators) return {};
  const fields: IndicatorFields = {};
  if (indicators.population) fields.population = formatPopulation(indicators.population);
  if (indicators.area) fields.area = formatArea(indicators.area);
  const economy: NonNullable<IndicatorFields["economy"]> = {};
  if (indicators.gdp) economy.gdp = formatGdp(indicators.gdp);
  if (indicators.growth) economy.growth = formatPercent(indicators.growth, true);
  if (indicators.inflation) economy.inflation = formatPercent(indicators.inflation, false);
  if (Object.keys(economy).length > 0) fields.economy = economy;
  return fields;
}

/** Fusionne les champs chiffrés dans l'overlay d'un pays : une valeur déjà présente dans le lot
 * (renseignée à la main) l'emporte toujours sur la Banque mondiale. */
export function mergeIndicatorFields(
  overlay: Record<string, unknown>,
  fields: IndicatorFields,
): Record<string, unknown> {
  const economy = (overlay.economy ?? {}) as Record<string, unknown>;
  return {
    ...overlay,
    population: overlay.population ?? fields.population,
    area: overlay.area ?? fields.area,
    economy: {
      ...economy,
      gdp: economy.gdp ?? fields.economy?.gdp,
      growth: economy.growth ?? fields.economy?.growth,
      inflation: economy.inflation ?? fields.economy?.inflation,
    },
  };
}
