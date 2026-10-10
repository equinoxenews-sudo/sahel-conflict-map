// Récupère les indicateurs chiffrés des fiches pays auprès de la Banque mondiale
// (API publique, sans clé) et les écrit dans data/country-profiles/indicators.json.
// Usage : npx tsx scripts/sync-country-indicators.ts
import fs from "node:fs";
import path from "node:path";
import europe from "../data/country-profiles/europe.json";
import type { CountryIndicators, IndicatorKey, IndicatorsFile } from "../lib/countryIndicators";

const INDICATORS: Record<IndicatorKey, string> = {
  population: "SP.POP.TOTL",
  area: "AG.SRF.TOTL.K2",
  gdp: "NY.GDP.MKTP.CD",
  growth: "NY.GDP.MKTP.KD.ZG",
  inflation: "FP.CPI.TOTL.ZG",
};

interface WorldBankRow {
  countryiso3code: string;
  date: string;
  value: number | null;
}

const OUT = path.join(process.cwd(), "data", "country-profiles", "indicators.json");
const countries = (europe as { countries: { slug: string; iso3: string }[] }).countries;

async function fetchIndicator(code: string): Promise<WorldBankRow[]> {
  const iso3 = countries.map((c) => c.iso3).join(";");
  // mrnev=1 : la valeur la plus récente non vide de chaque pays.
  const url = `https://api.worldbank.org/v2/country/${iso3}/indicator/${code}?format=json&mrnev=1&per_page=500`;
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Banque mondiale ${code} : HTTP ${response.status}`);
  const body = (await response.json()) as [unknown, WorldBankRow[] | null];
  return body[1] ?? [];
}

async function main() {
  const result: Record<string, CountryIndicators> = Object.fromEntries(countries.map((c) => [c.slug, {}]));
  const bySlug = new Map(countries.map((c) => [c.iso3, c.slug]));

  for (const [key, code] of Object.entries(INDICATORS) as [IndicatorKey, string][]) {
    const rows = await fetchIndicator(code);
    for (const row of rows) {
      const slug = bySlug.get(row.countryiso3code);
      if (!slug || row.value === null || !Number.isFinite(row.value)) continue;
      result[slug][key] = { value: row.value, year: Number(row.date) };
    }
    console.log(`${key} : ${rows.filter((r) => r.value !== null).length}/${countries.length} pays`);
  }

  const file: IndicatorsFile = {
    source: "World Bank Open Data — https://api.worldbank.org/v2/ (valeur la plus récente de chaque indicateur)",
    fetchedAt: new Date().toISOString().slice(0, 10),
    countries: result,
  };
  // Un échec partiel ne doit pas effacer un fichier correct : on exige au moins la population de la plupart des pays.
  const withPopulation = Object.values(result).filter((c) => c.population).length;
  if (withPopulation < countries.length * 0.8) throw new Error(`Réponse incomplète (${withPopulation} populations) : fichier inchangé.`);

  fs.writeFileSync(OUT, JSON.stringify(file, null, 2) + "\n");
  const missing = countries.flatMap((c) =>
    (Object.keys(INDICATORS) as IndicatorKey[]).filter((k) => !result[c.slug][k]).map((k) => `${c.slug}.${k}`),
  );
  console.log(missing.length ? `Valeurs absentes (restent « — ») : ${missing.join(", ")}` : "Aucune valeur absente.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
