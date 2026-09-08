/**
 * Maps our internal country display names (used across conflict_events,
 * lib/zones.ts, lib/gdeltCountries.ts) to ISO 3166-1 alpha-3 codes, which
 * is what the world GeoJSON (public/data/world-countries.geo.json) uses
 * as its feature id. Some labels map to more than one ISO3 (e.g. the
 * combined "Israel / Palestine" label).
 */
export const COUNTRY_TO_ISO3: Record<string, string[]> = {
  Mali: ["MLI"],
  "Burkina Faso": ["BFA"],
  Niger: ["NER"],
  "RD Congo": ["COD"],
  Soudan: ["SDN"],
  Mozambique: ["MOZ"],
  Nigeria: ["NGA"],
  Somalie: ["SOM"],

  Ukraine: ["UKR"],
  Serbie: ["SRB"],
  Kosovo: ["XKX"],

  "Israel / Palestine": ["ISR", "PSE"],
  Syrie: ["SYR"],
  Yemen: ["YEM"],
  Liban: ["LBN"],

  Myanmar: ["MMR"],
  Philippines: ["PHL"],
  Taiwan: ["TWN"],
  "Coree du Nord": ["PRK"],

  Colombie: ["COL"],
  Venezuela: ["VEN"],
  Perou: ["PER"],
  Equateur: ["ECU"],
  Haiti: ["HTI"],
  Bresil: ["BRA"],
  Chili: ["CHL"],
  Mexique: ["MEX"],
  Honduras: ["HND"],
  "El Salvador": ["SLV"],
  Guatemala: ["GTM"],
  Bolivie: ["BOL"],
  Argentine: ["ARG"],
  Guyana: ["GUY"],
  Paraguay: ["PRY"],
  Nicaragua: ["NIC"],
  Cuba: ["CUB"],
  Uruguay: ["URY"],
};
