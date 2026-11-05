import { FLAG_COUNTRIES } from "./countryFlagIndex";
import { ZONE_COUNTRIES } from "./zoneCountries";

// Fiche d'un pays pour la bulle du globe : nom français, drapeau, lien vers la fiche Approche et nombre d'articles sur la
// période choisie. Calcul pur et léger (pas de fiches pays complètes dans le paquet du globe), testé dans tests/globe-country.test.ts.

const DAY_MS = 86_400_000;
/** Période par défaut du globe (GlobeTimeRange) : les 5 derniers jours. */
export const DEFAULT_PERIOD_DAYS = 5;

export interface GlobeCountryInfo {
  iso3: string;
  /** Nom français courant (le fond de carte ne connaît que l'anglais). */
  name: string;
  /** Code ISO 2 du drapeau, quand le pays a un drapeau dans public/flags. */
  iso2: string | null;
  /** Fiche pays Approche : null pour un pays hors des cinq zones. */
  href: string | null;
}

const FLAG_BY_NAME = new Map(FLAG_COUNTRIES.map((country) => [country.name, country.iso2]));

const BY_ISO3: ReadonlyMap<string, GlobeCountryInfo> = new Map(
  Object.entries(ZONE_COUNTRIES).flatMap(([zone, countries]) =>
    countries.map((country) => [
      country.iso3,
      {
        iso3: country.iso3,
        name: country.name,
        iso2: FLAG_BY_NAME.get(country.name) ?? null,
        href: `/zones/${zone}/approche/pays/${country.slug}`,
      } satisfies GlobeCountryInfo,
    ]),
  ),
);

/** Informations d'un pays du globe d'après son code ISO 3 ; `fallbackName` (nom du fond de carte) si le pays est hors zones. */
export function globeCountryInfo(iso3: string, fallbackName: string): GlobeCountryInfo {
  return BY_ISO3.get(iso3) ?? { iso3, name: fallbackName, iso2: null, href: null };
}

export interface PeriodRange {
  start: number;
  end: number;
}

/** Période affichée : celle du curseur du globe, ou les 5 derniers jours tant qu'il n'a rien choisi. */
export function effectivePeriod(range: PeriodRange | null, now = Date.now()): PeriodRange {
  if (range) return range;
  const start = new Date(now - (DEFAULT_PERIOD_DAYS - 1) * DAY_MS);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start: start.getTime(), end: end.getTime() };
}

/** Éléments publiés dans la période (celle du curseur du globe, ou les 5 derniers jours). */
export function itemsInPeriod<T extends { publishedAt: string }>(items: readonly T[], range: PeriodRange | null, now = Date.now()): T[] {
  const { start, end } = effectivePeriod(range, now);
  return items.filter((item) => {
    const time = Date.parse(item.publishedAt);
    return time >= start && time <= end;
  });
}

/** Articles analysés d'un pays (clé ISO 3) publiés dans la période. */
export function countryArticleCount(events: readonly { iso3?: string | null; publishedAt: string }[], iso3: string, range: PeriodRange | null, now = Date.now()): number {
  return itemsInPeriod(events.filter((event) => event.iso3 === iso3), range, now).length;
}

const SHORT_DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

/** « 5 derniers jours » si la période se termine aujourd'hui, sinon « du 12 oct. au 17 oct. ». */
export function periodLabel(range: PeriodRange | null, now = Date.now()): string {
  const { start, end } = effectivePeriod(range, now);
  const days = Math.max(1, Math.round((end - start) / DAY_MS));
  if (end >= now - DAY_MS && end <= now + DAY_MS) return days === 1 ? "dernier jour" : `${days} derniers jours`;
  return `du ${SHORT_DATE.format(new Date(start))} au ${SHORT_DATE.format(new Date(end))}`;
}
