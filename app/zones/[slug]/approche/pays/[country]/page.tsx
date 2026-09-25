import { notFound } from "next/navigation";
import CountryProfilePage from "@/components/country-profile/CountryProfilePage";
import { getCountryProfile } from "@/lib/countries";
import { COUNTRY_MAPS } from "@/lib/countryMaps";
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
  const map = COUNTRY_MAPS[countrySlug];

  if (!zone || !country || !map || country.zoneSlug !== slug) notFound();

  return <CountryProfilePage country={country} map={map} />;
}
