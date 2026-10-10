// Génère lib/zoneCountries.ts : pour chaque zone, ses pays (slug, nom, code ISO 3),
// tirés des fiches pays. Un fichier léger utilisable dans le navigateur (lib/countries y est trop lourd)
// qui sert à colorer et rendre cliquables les zones sur le globe de l'introduction.
//   npx tsx scripts/gen-zone-countries.ts
import fs from "node:fs";
import path from "node:path";
import { COUNTRY_PROFILES_LIST } from "../lib/countries";

const ZONES = ["europe", "moyen-orient", "afrique", "indopacifique", "amerique-du-sud"];

const byZone = Object.fromEntries(
  ZONES.map((zone) => [
    zone,
    COUNTRY_PROFILES_LIST.filter((p) => p.zoneSlug === zone)
      .map((p) => ({ slug: p.slug, name: p.name, iso3: p.iso3 as string }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr")),
  ]),
);

const body = ZONES.map(
  (zone) =>
    `  ${JSON.stringify(zone)}: [\n${byZone[zone].map((c) => `    ${JSON.stringify(c)},`).join("\n")}\n  ],`,
).join("\n");

const out = `// Fichier généré par scripts/gen-zone-countries.ts — ne pas modifier à la main.
export interface ZoneCountry {
  slug: string;
  name: string;
  iso3: string;
}

export const ZONE_COUNTRIES: Record<string, readonly ZoneCountry[]> = {
${body}
};
`;
fs.writeFileSync(path.join(process.cwd(), "lib", "zoneCountries.ts"), out);
console.log(ZONES.map((zone) => `${zone} : ${byZone[zone].length}`).join(", "));
