// Génère lib/countryFlagIndex.ts : la liste (code ISO 2, nom français) des pays
// qui ont un drapeau dans public/flags, tirée des fiches pays. Un fichier
// léger utilisable côté navigateur, alors que lib/countries (toutes les
// fiches) est trop lourd pour y être importé.
//   npx tsx scripts/gen-country-flag-index.ts
import fs from "node:fs";
import path from "node:path";
import { COUNTRY_PROFILES_LIST } from "../lib/countries";

const root = process.cwd();
const rows = COUNTRY_PROFILES_LIST
  .filter((p) => p.iso2 && fs.existsSync(path.join(root, "public", "flags", `${p.iso2.toLowerCase()}.svg`)))
  .map((p) => ({ iso2: p.iso2 as string, name: p.name }))
  .sort((a, b) => a.name.localeCompare(b.name, "fr"));

const lines = rows.map((r) => `  { iso2: ${JSON.stringify(r.iso2)}, name: ${JSON.stringify(r.name)} },`);
const out = `// Fichier généré par scripts/gen-country-flag-index.ts — ne pas modifier à la main.
export interface FlagCountry {
  iso2: string;
  name: string;
}

export const FLAG_COUNTRIES: readonly FlagCountry[] = [
${lines.join("\n")}
];
`;
fs.writeFileSync(path.join(root, "lib", "countryFlagIndex.ts"), out);
console.log(`${rows.length} pays écrits dans lib/countryFlagIndex.ts`);
