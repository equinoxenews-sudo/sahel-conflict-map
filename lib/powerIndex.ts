import { MAX_AGE_YEARS, MIN_COMPONENTS, NUCLEAR_STATES, POWER_COMPONENTS, type PowerComponentId } from "./powerMethod";
import { WORLD_INDICATORS, type CountryWorldIndicators } from "./worldIndicators";

export { MAX_AGE_YEARS, MIN_COMPONENTS, NUCLEAR_STATES, POWER_COMPONENTS, type PowerComponentDefinition, type PowerComponentId } from "./powerMethod";

// Indice de puissance Équinoxe : un indicateur EXPÉRIMENTAL calculé par nous, sur des données publiques, avec une méthode affichée.
// Ce n'est ni un classement officiel ni celui d'un tiers. Les pondérations sont un choix éditorial, à valider par Nicolas.
//
// Méthode : pour chaque composante, le pays est classé parmi tous les pays qui ont une valeur (rang en percentile, de 0 à 100, ce qui
// évite qu'un géant écrase les autres). L'indice est la moyenne pondérée des composantes disponibles, de 0 à 100. Un pays doit avoir au
// moins trois composantes sur cinq pour recevoir un indice ; une composante absente ou trop ancienne est signalée « n/c », jamais devinée.

export interface PowerComponentScore {
  id: PowerComponentId;
  label: string;
  weight: number;
  /** Classement en percentile (0 à 100), ou null quand la donnée manque ou est périmée. */
  score: number | null;
}

export interface PowerIndexResult {
  /** Indice de 0 à 100. */
  score: number;
  rank: number;
  of: number;
  components: PowerComponentScore[];
}

type Raw = Partial<Record<Exclude<PowerComponentId, "nuclear">, number>>;

function usable(entry: { value: number; year: number } | undefined, now: number): number | null {
  if (!entry || entry.value <= 0 || now - entry.year > MAX_AGE_YEARS) return null;
  return entry.value;
}

function rawOf(indicators: CountryWorldIndicators, now: number): Raw {
  const out: Raw = {};
  const gdp = usable(indicators.gdp, now);
  const military = usable(indicators.military, now);
  const population = usable(indicators.population, now);
  const area = usable(indicators.area, now);
  if (gdp !== null) out.gdp = gdp;
  if (military !== null) out.military = military;
  if (population !== null) out.population = population;
  if (area !== null) out.area = area;
  return out;
}

/** Calcule l'indice de tous les pays d'un jeu de données. Fonction pure (testée). */
export function computePowerIndex(countries: Record<string, CountryWorldIndicators>, now = new Date().getFullYear()): Map<string, PowerIndexResult> {
  const raws = new Map(Object.entries(countries).map(([iso3, indicators]) => [iso3, rawOf(indicators, now)]));

  // Percentile de chaque pays pour chaque composante chiffrée : part des pays strictement plus faibles (ex æquo : moyenne des rangs).
  const percentiles = new Map<PowerComponentId, Map<string, number>>();
  for (const id of ["gdp", "military", "population", "area"] as const) {
    const values = [...raws.entries()].flatMap(([iso3, raw]) => (raw[id] !== undefined ? [[iso3, raw[id] as number] as const] : []));
    const sorted = values.map(([, value]) => value).sort((a, b) => a - b);
    const map = new Map<string, number>();
    for (const [iso3, value] of values) {
      const below = lowerBound(sorted, value);
      const equalOrBelow = upperBound(sorted, value);
      map.set(iso3, sorted.length > 1 ? (((below + equalOrBelow - 1) / 2) / (sorted.length - 1)) * 100 : 50);
    }
    percentiles.set(id, map);
  }

  const results: { iso3: string; score: number; components: PowerComponentScore[] }[] = [];
  for (const [iso3, raw] of raws) {
    const components: PowerComponentScore[] = POWER_COMPONENTS.map((definition) => {
      let score: number | null = null;
      if (definition.id === "nuclear") {
        // Pas de donnée sur les armes pour un pays dont on n'a rien d'autre : l'absence d'arme est un fait connu, pas une donnée manquante.
        score = Object.keys(raw).length > 0 ? (NUCLEAR_STATES.has(iso3) ? 100 : 0) : null;
      } else if (raw[definition.id] !== undefined) {
        score = percentiles.get(definition.id)?.get(iso3) ?? null;
      }
      return { id: definition.id, label: definition.label, weight: definition.weight, score };
    });
    const available = components.filter((component) => component.score !== null);
    if (available.length < MIN_COMPONENTS) continue;
    const weight = available.reduce((sum, component) => sum + component.weight, 0);
    const score = available.reduce((sum, component) => sum + (component.score as number) * component.weight, 0) / weight;
    results.push({ iso3, score, components });
  }

  results.sort((a, b) => b.score - a.score || a.iso3.localeCompare(b.iso3));
  return new Map(results.map((entry, index) => [entry.iso3, { score: Math.round(entry.score * 10) / 10, rank: index + 1, of: results.length, components: entry.components }]));
}

function lowerBound(sorted: number[], value: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function upperBound(sorted: number[], value: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

let cache: Map<string, PowerIndexResult> | null = null;

/** Indice d'un pays d'après les données mondiales du site ; null s'il n'a pas assez de données. */
export function powerIndexOf(iso3: string): PowerIndexResult | null {
  cache ??= computePowerIndex(WORLD_INDICATORS);
  return cache.get(iso3.toUpperCase()) ?? null;
}
