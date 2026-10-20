// Génère lib/countryFlagIndex.ts : la liste (code ISO 2, nom français) de tous les pays
// qui ont un drapeau dans public/flags. Les noms viennent des fiches pays quand elles existent
// (pour garder leur formulation), sinon de la base de noms de régions du navigateur (Intl) :
// ainsi les États-Unis, l'Inde, la Chine, le Canada… sont proposés même sans fiche pays.
// Un fichier léger utilisable côté navigateur, alors que lib/countries (toutes les fiches)
// est trop lourd pour y être importé.
//   npx tsx scripts/gen-country-flag-index.ts
import fs from "node:fs";
import path from "node:path";
import { COUNTRY_PROFILES_LIST } from "../lib/countries";

const root = process.cwd();
const regionNames = new Intl.DisplayNames(["fr"], { type: "region" });
const profileNames = new Map(
  COUNTRY_PROFILES_LIST.filter((p) => p.iso2).map((p) => [String(p.iso2).toUpperCase(), p.name] as const)
);

const rows = fs
  .readdirSync(path.join(root, "public", "flags"))
  .filter((file) => /^[a-z]{2}\.svg$/.test(file))
  .map((file) => file.slice(0, 2).toUpperCase())
  .map((iso2) => ({ iso2, name: profileNames.get(iso2) ?? regionNames.of(iso2) ?? iso2 }))
  // Un code inconnu de la base de noms resterait un simple code : on l'écarte plutôt que de l'afficher.
  .filter((row) => row.name !== row.iso2)
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
