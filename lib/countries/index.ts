import type { CountryProfile } from "@/types/country";
import { ARABIE_SAOUDITE } from "./arabie-saoudite";
import { EGYPTE } from "./egypte";
import { EMIRATS_ARABES_UNIS } from "./emirats-arabes-unis";
import { IRAK } from "./irak";
import { IRAN } from "./iran";
import { ISRAEL } from "./israel";
import { JORDANIE } from "./jordanie";
import { KOWEIT } from "./koweit";
import { LIBAN } from "./liban";
import { OMAN } from "./oman";
import { PALESTINE } from "./palestine";
import { QATAR } from "./qatar";
import { SYRIA } from "./syria";
import { TURQUIE } from "./turquie";
import { YEMEN } from "./yemen";

// Registry keyed by route slug (app/zones/[slug]/approche/pays/[country]).
// Add a new country here once its profile object exists — the page
// component itself is fully generic (<CountryProfilePage country={...} />).
const COUNTRY_PROFILES: Record<string, CountryProfile> = {
  syrie: SYRIA,
  israel: ISRAEL,
  palestine: PALESTINE,
  liban: LIBAN,
  jordanie: JORDANIE,
  irak: IRAK,
  iran: IRAN,
  "arabie-saoudite": ARABIE_SAOUDITE,
  yemen: YEMEN,
  koweit: KOWEIT,
  qatar: QATAR,
  "emirats-arabes-unis": EMIRATS_ARABES_UNIS,
  oman: OMAN,
  turquie: TURQUIE,
  egypte: EGYPTE,
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
