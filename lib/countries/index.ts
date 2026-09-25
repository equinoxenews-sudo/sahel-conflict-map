import type { CountryProfile } from "@/types/country";
import { SYRIA } from "./syria";

// Registry keyed by route slug (app/zones/[slug]/approche/pays/[country]).
// Add a new country here once its profile object exists — the page
// component itself is fully generic (<CountryProfilePage country={...} />).
const COUNTRY_PROFILES: Record<string, CountryProfile> = {
  syrie: SYRIA,
};

export function getCountryProfile(slug: string): CountryProfile | undefined {
  return COUNTRY_PROFILES[slug];
}

// Reverse index (ISO3 -> route slug) so the zone map (which only knows
// ISO3 country codes) can tell whether a clicked country has a profile
// page to navigate to — see components/zone-approche/ZoneCountryMap.tsx.
const SLUG_BY_ISO3: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_PROFILES)
    .filter(([, profile]) => profile.iso3)
    .map(([slug, profile]) => [profile.iso3 as string, slug])
);

export function getCountrySlugByIso3(iso3: string): string | undefined {
  return SLUG_BY_ISO3[iso3];
}
