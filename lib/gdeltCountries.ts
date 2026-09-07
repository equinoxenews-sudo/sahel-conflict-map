/**
 * Maps our zone country labels (lib/zones.ts) to GDELT's FIPS 10-4 country
 * codes (used in the ActionGeo_CountryCode field of the Event export).
 * FIPS 10-4 differs from ISO 3166-1 for several countries — notably
 * Niger=NG / Nigeria=NI (opposite of ISO) and Paraguay=PA / Panama=PM.
 * Some of our labels map to more than one FIPS code (e.g. a combined
 * "Israel / Palestine" label).
 */
export const COUNTRY_TO_FIPS: Record<string, string[]> = {
  Mali: ["ML"],
  "Burkina Faso": ["UV"],
  Niger: ["NG"],
  "RD Congo": ["CG"],
  Soudan: ["SU"],
  Mozambique: ["MZ"],
  Nigeria: ["NI"],
  Somalie: ["SO"],

  Ukraine: ["UP"],
  Serbie: ["RI"],
  Kosovo: ["KV"],

  "Israel / Palestine": ["IS", "WE", "GZ"],
  Syrie: ["SY"],
  Yemen: ["YM"],
  Liban: ["LE"],

  Myanmar: ["BM"],
  Philippines: ["RP"],
  Taiwan: ["TW"],
  "Coree du Nord": ["KN"],

  Colombie: ["CO"],
  Venezuela: ["VE"],
  Perou: ["PE"],
  Equateur: ["EC"],
  Haiti: ["HA"],
  Bresil: ["BR"],
  Chili: ["CI"],
  Mexique: ["MX"],
  Honduras: ["HO"],
  "El Salvador": ["ES"],
  Guatemala: ["GT"],
  Bolivie: ["BL"],
  Argentine: ["AR"],
  Guyana: ["GY"],
  Paraguay: ["PA"],
  Nicaragua: ["NU"],
  Cuba: ["CU"],
  Uruguay: ["UY"],
};

/** Reverse lookup: FIPS code -> our country label (first match wins). */
export const FIPS_TO_COUNTRY: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_TO_FIPS).flatMap(([country, codes]) =>
    codes.map((code) => [code, country])
  )
);
