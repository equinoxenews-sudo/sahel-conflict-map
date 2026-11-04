import type { CountryMapData } from "@/components/country-profile/CountryMap";
import { getCountryGeoConfig } from "@/lib/countryGeoConfig";
import { getResolvedCountryProfile } from "@/lib/countryOverlays";
import { getWorldCountryFeature } from "@/lib/worldGeo";
import { getZone } from "@/lib/zones";
import type { CountryProfile } from "@/types/country";
import { getApprocheData } from "./repository";
import type { CountryData } from "./schema";

// Ce que la route d'une fiche pays doit savoir pour s'afficher : la fiche de l'ancien modèle, la carte, et la fiche du
// nouveau modèle quand le pays est migré (data/approche/). Partagé par la page du pays et ses sous-pages d'onglets, qui
// sont toutes pré-rendues : aucune lecture de la requête, rien qui force un calcul à chaque visite.
export interface LoadedCountryPage {
  country: CountryProfile;
  map: CountryMapData;
  approche: CountryData | null;
}

export function loadCountryPage(zoneSlug: string, countrySlug: string): LoadedCountryPage | null {
  const zone = getZone(zoneSlug);
  const country = getResolvedCountryProfile(countrySlug);
  const geoConfig = getCountryGeoConfig(countrySlug);
  if (!zone || !country || !geoConfig || country.zoneSlug !== zoneSlug) return null;
  const mainFeature = getWorldCountryFeature(geoConfig.mainIso3);
  if (!mainFeature) return null;
  const neighborFeatures = Object.keys(geoConfig.neighbors)
    .map((iso3) => getWorldCountryFeature(iso3))
    .filter((feature): feature is NonNullable<typeof feature> => feature !== undefined);
  return {
    country,
    map: { main: mainFeature, mainName: country.name, neighbors: neighborFeatures, neighborNames: geoConfig.neighbors, cities: geoConfig.cities },
    approche: getApprocheData(country.iso3),
  };
}

/** Titre et description d'une fiche du nouveau modèle (la description est la première affirmation vérifiée). */
export function approcheMetadata(data: CountryData, tabLabel?: string) {
  const first = data.claims.find((claim) => claim.status === "verified")?.statement;
  return {
    title: `${data.name}${tabLabel ? ` — ${tabLabel}` : ""} — fiche stratégique | Équinoxe News`,
    description: first ?? `Fiche stratégique ${data.name}`,
  };
}
