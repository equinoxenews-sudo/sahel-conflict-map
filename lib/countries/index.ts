import type { CountryProfile } from "@/types/country";
import { ARABIE_SAOUDITE } from "./arabie-saoudite";
import { ARGENTINE } from "./argentine";
import { BOLIVIE } from "./bolivie";
import { BRESIL } from "./bresil";
import { BRUNEI } from "./brunei";
import { CAMBODGE } from "./cambodge";
import { CHILI } from "./chili";
import { CHINE } from "./chine";
import { COLOMBIE } from "./colombie";
import { COREE_DU_NORD } from "./coree-du-nord";
import { COREE_DU_SUD } from "./coree-du-sud";
import { EGYPTE } from "./egypte";
import { EMIRATS_ARABES_UNIS } from "./emirats-arabes-unis";
import { EQUATEUR } from "./equateur";
import { GUYANA } from "./guyana";
import { GUYANE_FRANCAISE } from "./guyane-francaise";
import { INDONESIE } from "./indonesie";
import { IRAK } from "./irak";
import { IRAN } from "./iran";
import { ISRAEL } from "./israel";
import { JAPON } from "./japon";
import { JORDANIE } from "./jordanie";
import { KOWEIT } from "./koweit";
import { LAOS } from "./laos";
import { LIBAN } from "./liban";
import { MALAISIE } from "./malaisie";
import { MONGOLIE } from "./mongolie";
import { MYANMAR } from "./myanmar";
import { OMAN } from "./oman";
import { PALESTINE } from "./palestine";
import { PARAGUAY } from "./paraguay";
import { PEROU } from "./perou";
import { PHILIPPINES } from "./philippines";
import { QATAR } from "./qatar";
import { SURINAME } from "./suriname";
import { SYRIA } from "./syria";
import { TAIWAN } from "./taiwan";
import { THAILANDE } from "./thailande";
import { TIMOR_ORIENTAL } from "./timor-oriental";
import { TURQUIE } from "./turquie";
import { URUGUAY } from "./uruguay";
import { VENEZUELA } from "./venezuela";
import { VIETNAM } from "./vietnam";
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
  chine: CHINE,
  japon: JAPON,
  "coree-du-sud": COREE_DU_SUD,
  "coree-du-nord": COREE_DU_NORD,
  taiwan: TAIWAN,
  mongolie: MONGOLIE,
  myanmar: MYANMAR,
  thailande: THAILANDE,
  vietnam: VIETNAM,
  laos: LAOS,
  cambodge: CAMBODGE,
  malaisie: MALAISIE,
  indonesie: INDONESIE,
  philippines: PHILIPPINES,
  brunei: BRUNEI,
  "timor-oriental": TIMOR_ORIENTAL,
  argentine: ARGENTINE,
  bolivie: BOLIVIE,
  bresil: BRESIL,
  chili: CHILI,
  colombie: COLOMBIE,
  equateur: EQUATEUR,
  "guyane-francaise": GUYANE_FRANCAISE,
  guyana: GUYANA,
  perou: PEROU,
  paraguay: PARAGUAY,
  suriname: SURINAME,
  uruguay: URUGUAY,
  venezuela: VENEZUELA,
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
