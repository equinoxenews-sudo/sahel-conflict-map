import type { CountryProfile } from "@/types/country";
import { AFRIQUE_DU_SUD } from "./afrique-du-sud";
import { ALBANIE } from "./albanie";
import { ALGERIE } from "./algerie";
import { ALLEMAGNE } from "./allemagne";
import { ANGOLA } from "./angola";
import { ARABIE_SAOUDITE } from "./arabie-saoudite";
import { ARGENTINE } from "./argentine";
import { ARMENIE } from "./armenie";
import { AUTRICHE } from "./autriche";
import { AZERBAIDJAN } from "./azerbaidjan";
import { BELGIQUE } from "./belgique";
import { BENIN } from "./benin";
import { BIELORUSSIE } from "./bielorussie";
import { BOLIVIE } from "./bolivie";
import { BOSNIE_HERZEGOVINE } from "./bosnie-herzegovine";
import { BOTSWANA } from "./botswana";
import { BRESIL } from "./bresil";
import { BRUNEI } from "./brunei";
import { BULGARIE } from "./bulgarie";
import { BURKINA_FASO } from "./burkina-faso";
import { BURUNDI } from "./burundi";
import { CAMBODGE } from "./cambodge";
import { CAMEROUN } from "./cameroun";
import { CHILI } from "./chili";
import { CHINE } from "./chine";
import { CHYPRE } from "./chypre";
import { COLOMBIE } from "./colombie";
import { COREE_DU_NORD } from "./coree-du-nord";
import { COREE_DU_SUD } from "./coree-du-sud";
import { COTE_D_IVOIRE } from "./cote-d-ivoire";
import { CROATIE } from "./croatie";
import { DANEMARK } from "./danemark";
import { DJIBOUTI } from "./djibouti";
import { EGYPTE } from "./egypte";
import { EMIRATS_ARABES_UNIS } from "./emirats-arabes-unis";
import { EQUATEUR } from "./equateur";
import { ERYTHREE } from "./erythree";
import { ESPAGNE } from "./espagne";
import { ESTONIE } from "./estonie";
import { ESWATINI } from "./eswatini";
import { ETHIOPIE } from "./ethiopie";
import { FINLANDE } from "./finlande";
import { FRANCE } from "./france";
import { GABON } from "./gabon";
import { GAMBIE } from "./gambie";
import { GEORGIE } from "./georgie";
import { GHANA } from "./ghana";
import { GRECE } from "./grece";
import { GUINEE } from "./guinee";
import { GUINEE_BISSAU } from "./guinee-bissau";
import { GUINEE_EQUATORIALE } from "./guinee-equatoriale";
import { GUYANA } from "./guyana";
import { GUYANE_FRANCAISE } from "./guyane-francaise";
import { HONGRIE } from "./hongrie";
import { INDONESIE } from "./indonesie";
import { IRAK } from "./irak";
import { IRAN } from "./iran";
import { IRLANDE } from "./irlande";
import { ISLANDE } from "./islande";
import { ISRAEL } from "./israel";
import { ITALIE } from "./italie";
import { JAPON } from "./japon";
import { JORDANIE } from "./jordanie";
import { KENYA } from "./kenya";
import { KOSOVO } from "./kosovo";
import { KOWEIT } from "./koweit";
import { LAOS } from "./laos";
import { LESOTHO } from "./lesotho";
import { LETTONIE } from "./lettonie";
import { LIBAN } from "./liban";
import { LIBERIA } from "./liberia";
import { LIBYE } from "./libye";
import { LITUANIE } from "./lituanie";
import { LUXEMBOURG } from "./luxembourg";
import { MACEDOINE_DU_NORD } from "./macedoine-du-nord";
import { MADAGASCAR } from "./madagascar";
import { MALAISIE } from "./malaisie";
import { MALAWI } from "./malawi";
import { MALI } from "./mali";
import { MALTE } from "./malte";
import { MAROC } from "./maroc";
import { MAURITANIE } from "./mauritanie";
import { MOLDAVIE } from "./moldavie";
import { MONGOLIE } from "./mongolie";
import { MONTENEGRO } from "./montenegro";
import { MOZAMBIQUE } from "./mozambique";
import { MYANMAR } from "./myanmar";
import { NAMIBIE } from "./namibie";
import { NIGER } from "./niger";
import { NIGERIA } from "./nigeria";
import { NORVEGE } from "./norvege";
import { OMAN } from "./oman";
import { OUGANDA } from "./ouganda";
import { PALESTINE } from "./palestine";
import { PARAGUAY } from "./paraguay";
import { PAYS_BAS } from "./pays-bas";
import { PEROU } from "./perou";
import { PHILIPPINES } from "./philippines";
import { POLOGNE } from "./pologne";
import { PORTUGAL } from "./portugal";
import { QATAR } from "./qatar";
import { REPUBLIQUE_CENTRAFRICAINE } from "./republique-centrafricaine";
import { REPUBLIQUE_DEMOCRATIQUE_DU_CONGO } from "./republique-democratique-du-congo";
import { REPUBLIQUE_DU_CONGO } from "./republique-du-congo";
import { ROUMANIE } from "./roumanie";
import { ROYAUME_UNI } from "./royaume-uni";
import { RUSSIE } from "./russie";
import { RWANDA } from "./rwanda";
import { SAHARA_OCCIDENTAL } from "./sahara-occidental";
import { SENEGAL } from "./senegal";
import { SERBIE } from "./serbie";
import { SIERRA_LEONE } from "./sierra-leone";
import { SLOVAQUIE } from "./slovaquie";
import { SLOVENIE } from "./slovenie";
import { SOMALIE } from "./somalie";
import { SOUDAN } from "./soudan";
import { SOUDAN_DU_SUD } from "./soudan-du-sud";
import { SUEDE } from "./suede";
import { SUISSE } from "./suisse";
import { SURINAME } from "./suriname";
import { SYRIA } from "./syria";
import { TAIWAN } from "./taiwan";
import { TANZANIE } from "./tanzanie";
import { TCHAD } from "./tchad";
import { TCHEQUIE } from "./tchequie";
import { THAILANDE } from "./thailande";
import { TIMOR_ORIENTAL } from "./timor-oriental";
import { TOGO } from "./togo";
import { TUNISIE } from "./tunisie";
import { TURQUIE } from "./turquie";
import { UKRAINE } from "./ukraine";
import { URUGUAY } from "./uruguay";
import { VENEZUELA } from "./venezuela";
import { VIETNAM } from "./vietnam";
import { YEMEN } from "./yemen";
import { ZAMBIE } from "./zambie";
import { ZIMBABWE } from "./zimbabwe";

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
  albanie: ALBANIE,
  armenie: ARMENIE,
  autriche: AUTRICHE,
  azerbaidjan: AZERBAIDJAN,
  belgique: BELGIQUE,
  bulgarie: BULGARIE,
  "bosnie-herzegovine": BOSNIE_HERZEGOVINE,
  bielorussie: BIELORUSSIE,
  suisse: SUISSE,
  chypre: CHYPRE,
  tchequie: TCHEQUIE,
  allemagne: ALLEMAGNE,
  danemark: DANEMARK,
  espagne: ESPAGNE,
  estonie: ESTONIE,
  finlande: FINLANDE,
  france: FRANCE,
  "royaume-uni": ROYAUME_UNI,
  georgie: GEORGIE,
  grece: GRECE,
  croatie: CROATIE,
  hongrie: HONGRIE,
  irlande: IRLANDE,
  islande: ISLANDE,
  italie: ITALIE,
  kosovo: KOSOVO,
  lituanie: LITUANIE,
  luxembourg: LUXEMBOURG,
  lettonie: LETTONIE,
  moldavie: MOLDAVIE,
  "macedoine-du-nord": MACEDOINE_DU_NORD,
  malte: MALTE,
  montenegro: MONTENEGRO,
  "pays-bas": PAYS_BAS,
  norvege: NORVEGE,
  pologne: POLOGNE,
  portugal: PORTUGAL,
  roumanie: ROUMANIE,
  russie: RUSSIE,
  serbie: SERBIE,
  slovaquie: SLOVAQUIE,
  slovenie: SLOVENIE,
  suede: SUEDE,
  ukraine: UKRAINE,
  angola: ANGOLA,
  burundi: BURUNDI,
  benin: BENIN,
  "burkina-faso": BURKINA_FASO,
  botswana: BOTSWANA,
  "republique-centrafricaine": REPUBLIQUE_CENTRAFRICAINE,
  "cote-d-ivoire": COTE_D_IVOIRE,
  cameroun: CAMEROUN,
  "republique-democratique-du-congo": REPUBLIQUE_DEMOCRATIQUE_DU_CONGO,
  "republique-du-congo": REPUBLIQUE_DU_CONGO,
  djibouti: DJIBOUTI,
  algerie: ALGERIE,
  erythree: ERYTHREE,
  ethiopie: ETHIOPIE,
  gabon: GABON,
  ghana: GHANA,
  guinee: GUINEE,
  gambie: GAMBIE,
  "guinee-bissau": GUINEE_BISSAU,
  "guinee-equatoriale": GUINEE_EQUATORIALE,
  kenya: KENYA,
  liberia: LIBERIA,
  libye: LIBYE,
  lesotho: LESOTHO,
  maroc: MAROC,
  madagascar: MADAGASCAR,
  mali: MALI,
  mozambique: MOZAMBIQUE,
  mauritanie: MAURITANIE,
  malawi: MALAWI,
  namibie: NAMIBIE,
  niger: NIGER,
  nigeria: NIGERIA,
  rwanda: RWANDA,
  "sahara-occidental": SAHARA_OCCIDENTAL,
  soudan: SOUDAN,
  "soudan-du-sud": SOUDAN_DU_SUD,
  senegal: SENEGAL,
  "sierra-leone": SIERRA_LEONE,
  somalie: SOMALIE,
  eswatini: ESWATINI,
  tchad: TCHAD,
  togo: TOGO,
  tanzanie: TANZANIE,
  ouganda: OUGANDA,
  "afrique-du-sud": AFRIQUE_DU_SUD,
  zambie: ZAMBIE,
  zimbabwe: ZIMBABWE,
  tunisie: TUNISIE,
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
