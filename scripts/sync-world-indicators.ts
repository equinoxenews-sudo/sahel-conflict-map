// Indicateurs chiffrés de TOUS les pays (Banque mondiale, API publique sans clé) pour le panneau pays du globe et l'indice de
// puissance Équinoxe. Écrit data/world-indicators.json.
// Usage : npx tsx scripts/sync-world-indicators.ts
import fs from "node:fs";
import path from "node:path";
import type { WorldIndicatorsFile, WorldIndicatorKey } from "../lib/worldIndicators";

const INDICATORS: Record<WorldIndicatorKey, string> = {
  population: "SP.POP.TOTL",
  area: "AG.SRF.TOTL.K2",
  gdp: "NY.GDP.MKTP.CD",
  military: "MS.MIL.XPND.CD",
};

interface IndicatorRow {
  countryiso3code: string;
  date: string;
  value: number | null;
}

interface CountryRow {
  id: string;
  region: { id: string };
}

const OUT = path.join(process.cwd(), "data", "world-indicators.json");
const BASE = "https://api.worldbank.org/v2";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Banque mondiale : HTTP ${response.status} (${url})`);
  return (await response.json()) as T;
}

async function main() {
  // Pays réels : la liste contient aussi des agrégats (« Monde », « Afrique subsaharienne »…), de région « NA », à écarter.
  const [, countryRows] = await getJson<[unknown, CountryRow[]]>(`${BASE}/country?format=json&per_page=400`);
  const real = new Set(countryRows.filter((row) => row.region.id !== "NA").map((row) => row.id));

  const countries: WorldIndicatorsFile["countries"] = {};
  for (const [key, code] of Object.entries(INDICATORS) as [WorldIndicatorKey, string][]) {
    // Toutes les années depuis 2010 (« mrnev » est ignoré quand on demande tous les pays) : on garde, par pays, la plus récente non vide.
    const [, rows] = await getJson<[unknown, IndicatorRow[] | null]>(`${BASE}/country/all/indicator/${code}?format=json&date=2010:2026&per_page=10000`);
    let kept = 0;
    for (const row of rows ?? []) {
      if (!real.has(row.countryiso3code) || row.value === null || !Number.isFinite(row.value)) continue;
      const slot = (countries[row.countryiso3code] ??= {});
      const year = Number(row.date);
      if (!slot[key] || slot[key].year < year) slot[key] = { value: row.value, year };
    }
    for (const country of Object.values(countries)) if (country[key]) kept++;
    console.log(`${key} : ${kept} pays`);
  }

  // Un échec partiel ne doit pas effacer un fichier correct.
  const withPopulation = Object.values(countries).filter((c) => c.population).length;
  if (withPopulation < 150) throw new Error(`Réponse incomplète (${withPopulation} populations) : fichier inchangé.`);

  const file: WorldIndicatorsFile = {
    source: "World Bank Open Data (licence CC BY 4.0) — https://api.worldbank.org/v2/ ; dépenses militaires : SIPRI via la Banque mondiale (MS.MIL.XPND.CD)",
    fetchedAt: new Date().toISOString().slice(0, 10),
    countries: Object.fromEntries(Object.entries(countries).sort(([a], [b]) => a.localeCompare(b))),
  };
  fs.writeFileSync(OUT, JSON.stringify(file) + "\n");
  console.log(`${Object.keys(countries).length} pays écrits.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
