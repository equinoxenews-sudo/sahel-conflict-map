import { notFound } from "next/navigation";
import CountryProfilePage from "@/components/country-profile/CountryProfilePage";
import { getCountryProfile } from "@/lib/countries";
import { getCountryGeoConfig } from "@/lib/countryGeoConfig";
import { getWorldCountryFeature } from "@/lib/worldGeo";
import { getZone } from "@/lib/zones";

export const revalidate = 3600;

export default async function CountryPage({
  params,
}: {
  params: Promise<{ slug: string; country: string }>;
}) {
  const { slug, country: countrySlug } = await params;
  const zone = getZone(slug);
  const country = getCountryProfile(countrySlug);
  const geoConfig = getCountryGeoConfig(countrySlug);

  if (!zone || !country || !geoConfig || country.zoneSlug !== slug) notFound();

  const mainFeature = getWorldCountryFeature(geoConfig.mainIso3);
  if (!mainFeature) notFound();

  const neighborFeatures = Object.keys(geoConfig.neighbors)
    .map((iso3) => getWorldCountryFeature(iso3))
    .filter((f): f is NonNullable<typeof f> => f !== undefined);

  return (
    <CountryProfilePage
      country={country}
      map={{ main: mainFeature, neighbors: neighborFeatures, cities: geoConfig.cities }}
    />
  );
}
