// Génère lib/countryCodes.ts : (code ISO 2, code ISO 3, nom français) de tous les pays qui ont un drapeau et un contour sur le globe.
// ISO 3 : fiches pays quand elles existent, sinon rapprochement du nom anglais (base Intl) avec le fond de carte du globe.
//   npx tsx scripts/gen-country-codes.ts
import fs from "node:fs";
import path from "node:path";
import { COUNTRY_PROFILES_LIST } from "../lib/countries";
import { FLAG_COUNTRIES } from "../lib/countryFlagIndex";

const root = process.cwd();
const world = JSON.parse(fs.readFileSync(path.join(root, "public", "data", "world-countries.geo.json"), "utf8")) as { features: { id: string; properties: { name: string } }[] };
const en = new Intl.DisplayNames(["en"], { type: "region" });
const norm = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, " ").trim();

const byGeoName = new Map(world.features.map((feature) => [norm(feature.properties.name), feature.id]));
const geoIds = new Set(world.features.map((feature) => feature.id));
// Noms anglais d'Intl qui diffèrent de ceux du fond de carte.
const ALIASES: Record<string, string> = { "united states": "USA", czechia: "CZE", "congo kinshasa": "COD", "congo brazzaville": "COG", "cote d ivoire": "CIV", eswatini: "SWZ", "north macedonia": "MKD", "timor leste": "TLS", "myanmar burma": "MMR", "hong kong sar china": "HKG", "macao sar china": "MAC", "palestinian territories": "PSE", "turkiye": "TUR", "bosnia and herzegovina": "BIH", serbia: "SRB", "cabo verde": "CPV", "falkland islands": "FLK", "south korea": "KOR", "north korea": "PRK", "russia": "RUS", "syria": "SYR", "laos": "LAO", "vietnam": "VNM", "bolivia": "BOL", "venezuela": "VEN", "tanzania": "TZA", "moldova": "MDA", "iran": "IRN", "brunei": "BRN", "gambia": "GMB", "bahamas": "BHS" };

// États et territoires sans contour sur le globe (trop petits) : utiles pour étiqueter un article, pas pour cliquer.
const NO_OUTLINE: Record<string, string> = { AD: "AND", AG: "ATG", BH: "BHR", BB: "BRB", KM: "COM", DM: "DMA", VA: "VAT", GD: "GRD", KI: "KIR", LI: "LIE", MV: "MDV", MU: "MUS", FM: "FSM", MC: "MCO", NR: "NRU", PW: "PLW", WS: "WSM", SC: "SYC", SG: "SGP", TO: "TON", TT: "TTO", TV: "TUV", KN: "KNA", SM: "SMR", VC: "VCT", LC: "LCA", MH: "MHL", HK: "HKG", MO: "MAC" };

const profileIso3 = new Map(COUNTRY_PROFILES_LIST.filter((p) => p.iso2 && p.iso3).map((p) => [String(p.iso2).toUpperCase(), String(p.iso3)] as const));
const rows: { iso2: string; iso3: string; name: string }[] = [];
const missing: string[] = [];
for (const country of FLAG_COUNTRIES) {
  const english = norm(en.of(country.iso2) ?? "");
  const iso3 = profileIso3.get(country.iso2) ?? ALIASES[english] ?? byGeoName.get(english) ?? NO_OUTLINE[country.iso2];
  if (!iso3 || (!geoIds.has(iso3) && NO_OUTLINE[country.iso2] !== iso3)) {
    missing.push(`${country.iso2} ${country.name} (${english})`);
    continue;
  }
  rows.push({ iso2: country.iso2, iso3, name: country.name });
}
rows.sort((a, b) => a.name.localeCompare(b.name, "fr"));
const lines = rows.map((r) => `  { iso2: ${JSON.stringify(r.iso2)}, iso3: ${JSON.stringify(r.iso3)}, name: ${JSON.stringify(r.name)} },`);
fs.writeFileSync(
  path.join(root, "lib", "countryCodes.ts"),
  `// Fichier généré par scripts/gen-country-codes.ts — ne pas modifier à la main.\nexport interface CountryCode {\n  iso2: string;\n  iso3: string;\n  name: string;\n}\n\nexport const COUNTRY_CODES: readonly CountryCode[] = [\n${lines.join("\n")}\n];\n`,
);
console.log(`${rows.length} pays écrits ; sans contour ou sans correspondance (écartés) : ${missing.length}`);
console.log(missing.join("\n"));
