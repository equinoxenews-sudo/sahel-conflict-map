// Récupère les séries Banque mondiale des fiches « Approche » (population, PIB, croissance, inflation, chômage, superficie,
// recherche-développement) et écrit data/approche/<ISO3>.worldbank.json : sources et observations, avec leur historique.
// Politique de licences : une série dont l'organisme d'origine est SIPRI (ou dont le code est dans la liste d'exclusion de
// lib/approche/sourceRegistry.ts) est refusée, même quand la Banque mondiale la redistribue.
//
//   npx tsx scripts/sync-approche-worldbank.ts FRA [ISO3 ...]
import fs from "node:fs";
import path from "node:path";
import { BLOCKED_PUBLISHERS, BLOCKED_WORLD_BANK_INDICATORS } from "../lib/approche/sourceRegistry";
import type { Observation, SourceRecord } from "../lib/approche/schema";

interface Series {
  key: string;
  code: string;
  unit: string;
  topic: string;
  title: string;
  methodology: string;
  currency?: string;
}

const SERIES: Series[] = [
  { key: "demography.population", code: "SP.POP.TOTL", unit: "habitants", topic: "population", title: "Population totale", methodology: "Estimation de la population totale au milieu de l'année (définition de fait : tous les résidents, quelle que soit leur nationalité)." },
  { key: "economy.gdp_nominal_usd", code: "NY.GDP.MKTP.CD", unit: "USD", currency: "USD", topic: "gdp", title: "PIB (dollars américains courants)", methodology: "Produit intérieur brut aux prix courants converti en dollars américains au taux de change officiel moyen de l'année." },
  { key: "economy.gdp_per_capita_usd", code: "NY.GDP.PCAP.CD", unit: "USD", currency: "USD", topic: "gdp_per_capita", title: "PIB par habitant (dollars américains courants)", methodology: "PIB nominal en dollars courants divisé par la population au milieu de l'année." },
  { key: "economy.gdp_growth", code: "NY.GDP.MKTP.KD.ZG", unit: "%", topic: "growth", title: "Croissance annuelle du PIB réel", methodology: "Variation annuelle du PIB aux prix constants (volumes)." },
  { key: "economy.inflation_cpi", code: "FP.CPI.TOTL.ZG", unit: "%", topic: "inflation", title: "Inflation, indice des prix à la consommation (variation annuelle)", methodology: "Variation annuelle de l'indice des prix à la consommation (IPC) national." },
  { key: "labour.unemployment_ilo", code: "SL.UEM.TOTL.ZS", unit: "%", topic: "unemployment", title: "Chômage, total (% de la population active, estimation modélisée de l'OIT)", methodology: "Estimation modélisée de l'OIT : à distinguer du taux de chômage au sens du BIT publié par l'INSEE." },
  { key: "geography.surface_area", code: "AG.SRF.TOTL.K2", unit: "km²", topic: "area", title: "Superficie (km²)", methodology: "Superficie totale du pays, eaux intérieures comprises, selon la définition de la Banque mondiale." },
  { key: "research.rd_gdp", code: "GB.XPD.RSDV.GD.ZS", unit: "%", topic: "rd", title: "Dépenses de recherche-développement (% du PIB)", methodology: "Dépenses intérieures de recherche-développement, en pourcentage du PIB." },
];

const HISTORY_YEARS = 12;
const today = new Date().toISOString().slice(0, 10);
/** Origine déclarée par la Banque mondiale, sans les adresses internes, ramenée à une phrase lisible. */
function shorten(origin: string): string {
  const clean = origin.replace(/,?\s*uri:\s*\S+/gi, "").replace(/\s+/g, " ").trim();
  if (!clean) return "non précisé";
  return clean.length <= 260 ? clean : `${clean.slice(0, 259).trimEnd()}…`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson<T>(url: string): Promise<T> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (response.ok) return (await response.json()) as T;
    } catch {
      // nouvel essai
    }
    await sleep(800 * attempt);
  }
  throw new Error(`Banque mondiale injoignable : ${url}`);
}

interface Row {
  date: string;
  value: number | null;
  country: { id: string; value: string };
}

async function main() {
  const codes = process.argv.slice(2).map((code) => code.toUpperCase());
  if (codes.length === 0) throw new Error("Donne au moins un code pays ISO 3 (ex. FRA).");
  for (const iso3 of codes) {
    const sources: SourceRecord[] = [];
    const observations: Observation[] = [];
    for (const series of SERIES) {
      if (BLOCKED_WORLD_BANK_INDICATORS.includes(series.code)) throw new Error(`Série exclue (licence) : ${series.code}`);
      const meta = await getJson<[unknown, { name?: string; sourceOrganization?: string; source?: { value?: string } }[]]>(`https://api.worldbank.org/v2/indicator/${series.code}?format=json`);
      const origin = `${meta[1]?.[0]?.sourceOrganization ?? ""} ${meta[1]?.[0]?.source?.value ?? ""}`;
      if (BLOCKED_PUBLISHERS.some((pattern) => pattern.test(origin))) throw new Error(`Série ${series.code} : organisme d'origine exclu (${origin.trim()})`);

      const url = `https://api.worldbank.org/v2/country/${iso3}/indicator/${series.code}?format=json&per_page=${HISTORY_YEARS + 6}`;
      const body = await getJson<[{ lastupdated?: string }, Row[] | null]>(url);
      const rows = (body[1] ?? []).filter((row) => row.value !== null).sort((a, b) => Number(a.date) - Number(b.date));
      await sleep(400);
      if (rows.length === 0) continue;
      const latest = rows[rows.length - 1];
      const iso2 = latest.country.id;
      const sourceId = `S01-WB-${series.code}`;
      sources.push({
        id: sourceId,
        publisher: "Banque mondiale",
        title: `World Development Indicators — ${series.title}`,
        canonicalUrl: `https://data.worldbank.org/indicator/${series.code}?locations=${iso2}`,
        apiUrl: url,
        datasetId: series.code,
        datasetVersion: body[0]?.lastupdated ?? null,
        publishedAt: body[0]?.lastupdated ?? null,
        accessedAt: today,
        license: "CC BY 4.0 (Banque mondiale, données ouvertes)",
        reuse: "allowed",
        originalPublisher: shorten(origin),
        methodNotes: `Organisme d'origine déclaré : ${shorten(origin)}. Série révisable ; vérifier l'origine de la donnée avant toute réutilisation commerciale.`,
        language: "fr",
      });
      observations.push({
        id: `${iso3.toLowerCase()}-${series.key.replace(/\./g, "-")}-${latest.date}`,
        countryCode: iso3,
        key: series.key,
        topic: series.topic,
        value: latest.value,
        unit: series.unit,
        currency: series.currency ?? null,
        referencePeriod: latest.date,
        geographicScope: `${latest.country.value}, périmètre Banque mondiale`,
        methodology: series.methodology,
        sourceIds: [sourceId],
        collectedAt: today,
        verifiedAt: today,
        status: "verified",
        dataKind: "observed",
        calculationFormula: null,
        history: rows.slice(-HISTORY_YEARS).map((row) => ({ period: row.date, value: row.value as number })),
      });
      console.log(`${iso3} ${series.key} : ${latest.value} (${latest.date})`);
    }
    const out = path.join(process.cwd(), "data", "approche", `${iso3}.worldbank.json`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify({ countryCode: iso3, fetchedAt: today, sources, observations }, null, 2)}\n`);
    console.log(`${observations.length} observations écrites dans ${path.relative(process.cwd(), out)}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
