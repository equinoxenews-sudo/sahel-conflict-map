import { notFound } from "next/navigation";
import ApprocheCountryPage from "@/components/approche/ApprocheCountryPage";
import CountryProfilePage from "@/components/country-profile/CountryProfilePage";
import { getApprocheData } from "@/lib/approche/repository";
import { validateTab } from "@/lib/approche/tabs";
import { getResolvedCountryProfile } from "@/lib/countryOverlays";
import { getCountryGeoConfig } from "@/lib/countryGeoConfig";
import { getWorldCountryFeature } from "@/lib/worldGeo";
import { getZone } from "@/lib/zones";

export default async function CountryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; country: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug, country: countrySlug } = await params;
  const zone = getZone(slug);
  const country = getResolvedCountryProfile(countrySlug);
  const geoConfig = getCountryGeoConfig(countrySlug);

  if (!zone || !country || !geoConfig || country.zoneSlug !== slug) notFound();

  const mainFeature = getWorldCountryFeature(geoConfig.mainIso3);
  if (!mainFeature) notFound();

  const neighborFeatures = Object.keys(geoConfig.neighbors)
    .map((iso3) => getWorldCountryFeature(iso3))
    .filter((f): f is NonNullable<typeof f> => f !== undefined);

  const map = {
    main: mainFeature,
    mainName: country.name,
    neighbors: neighborFeatures,
    neighborNames: geoConfig.neighbors,
    cities: geoConfig.cities,
  };

  // Pays migrés vers le modèle sourcé (data/approche/) : nouvelle fiche à six onglets (?tab=). Les autres gardent l'ancienne.
  const approche = getApprocheData(country.iso3);
  if (approche) {
    const { tab } = await searchParams;
    return <ApprocheCountryPage data={approche} iso2={country.iso2} tab={validateTab(tab)} map={map} />;
  }

  return <CountryProfilePage country={country} map={map} />;
}
