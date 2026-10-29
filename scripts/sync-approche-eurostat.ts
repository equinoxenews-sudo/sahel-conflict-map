// Récupère les séries Eurostat des fiches « Approche » d'un pays européen : valeur ajoutée par branche (nama_10_a10), dette brute
// des administrations publiques en % du PIB (gov_10q_ggdebt) et dépendance aux importations d'énergie (nrg_ind_id). Écrit
// data/approche/<ISO3>.eurostat.json (sources et observations, historique compris). Les parts de chaque branche sont des valeurs
// CALCULÉES (valeur ajoutée de la branche / valeur ajoutée totale), marquées comme telles avec leur formule.
//
//   npx tsx scripts/sync-approche-eurostat.ts FRA:FR [ISO3:ISO2 ...]
import fs from "node:fs";
import path from "node:path";
import type { Observation, SourceRecord } from "../lib/approche/schema";

const API = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";
const LEGAL = "https://european-union.europa.eu/legal-notice_en";
const today = new Date().toISOString().slice(0, 10);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Branches de la nomenclature A10 (le secteur C, industrie manufacturière, est inclus dans B-E : écarté pour ne rien compter deux fois). */
const BRANCHES: Record<string, string> = {
  A: "Agriculture, sylviculture et pêche",
  "B-E": "Industrie (hors construction)",
  F: "Construction",
  "G-I": "Commerce, transports, hébergement et restauration",
  J: "Information et communication",
  K: "Activités financières et d'assurance",
  L: "Activités immobilières",
  M_N: "Activités scientifiques, techniques et de soutien aux entreprises",
  "O-Q": "Administration publique, défense, enseignement, santé et action sociale",
  "R-U": "Arts, loisirs et autres activités de services",
};

interface JsonStat {
  id: string[];
  size: number[];
  value: Record<string, number | null>;
  updated?: string;
  dimension: Record<string, { category: { index: Record<string, number>; label: Record<string, string> } }>;
}

async function getJson(url: string): Promise<JsonStat> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(40_000) });
      if (response.ok) return (await response.json()) as JsonStat;
    } catch {
      // nouvel essai
    }
    await sleep(900 * attempt);
  }
  throw new Error(`Eurostat injoignable : ${url}`);
}

function source(dataset: string, title: string, apiUrl: string, updated: string | undefined, geo: string, notes: string): SourceRecord {
  return {
    id: `S03-EUROSTAT-${dataset}`,
    publisher: "Eurostat",
    title,
    canonicalUrl: `https://ec.europa.eu/eurostat/databrowser/view/${dataset}/default/table?lang=en&geo=${geo}`,
    apiUrl,
    datasetId: dataset,
    datasetVersion: updated ?? null,
    publishedAt: updated ? updated.slice(0, 10) : null,
    accessedAt: today,
    license: "CC BY 4.0 (politique de réutilisation de la Commission européenne ; mention de la source et des modifications)",
    licenseUrl: LEGAL,
    reuse: "allowed",
    methodNotes: `${notes} Licence établie d'après la notice juridique de l'UE ; la page de droits d'auteur propre à Eurostat n'a pas pu être lue.`,
    language: "en",
  };
}

async function main() {
  const pairs = process.argv.slice(2).map((arg) => arg.split(":"));
  if (pairs.length === 0 || pairs.some(([iso3, iso2]) => !iso3 || !iso2)) throw new Error("Donne des paires ISO3:ISO2 (ex. FRA:FR).");
  for (const [iso3raw, iso2raw] of pairs) {
    const iso3 = iso3raw.toUpperCase();
    const geo = iso2raw.toUpperCase();
    const sources: SourceRecord[] = [];
    const observations: Observation[] = [];
    const base = { countryCode: iso3, collectedAt: today, verifiedAt: today, status: "verified" as const };

    // --- Valeur ajoutée par branche (millions d'euros, prix courants) ---
    const vaUrl = `${API}/nama_10_a10?format=JSON&lang=EN&geo=${geo}&unit=CP_MEUR&na_item=B1G&sinceTimePeriod=${new Date().getFullYear() - 6}`;
    const va = await getJson(vaUrl);
    const years = Object.keys(va.dimension.time.category.index);
    const nace = va.dimension.nace_r2.category.index;
    const cell = (code: string, year: string) => va.value[String(nace[code] * years.length + years.indexOf(year))] ?? null;
    const latestYear = [...years].reverse().find((year) => cell("TOTAL", year) !== null && Object.keys(BRANCHES).every((code) => cell(code, year) !== null));
    if (latestYear) {
      const vaSource = source("nama_10_a10", "Valeur ajoutée brute par branche (A10), prix courants", vaUrl, va.updated, geo, "Valeur ajoutée brute aux prix courants, en millions d'euros, nomenclature A10 (NACE Rév. 2). La valeur ajoutée n'est ni le PIB ni l'emploi par branche.");
      sources.push(vaSource);
      const total = cell("TOTAL", latestYear) as number;
      observations.push({
        ...base,
        id: `${iso3.toLowerCase()}-va-total-${latestYear}`,
        key: "economy.value_added.total",
        topic: "value_added",
        label: "Valeur ajoutée brute totale",
        value: total * 1e6,
        unit: "EUR",
        currency: "EUR",
        referencePeriod: latestYear,
        geographicScope: `${geo}, économie totale`,
        methodology: "Somme de la valeur ajoutée brute de toutes les branches, aux prix courants.",
        sourceIds: [vaSource.id],
        dataKind: "observed",
        calculationFormula: null,
        history: years.filter((year) => cell("TOTAL", year) !== null).map((year) => ({ period: year, value: (cell("TOTAL", year) as number) * 1e6 })),
      });
      for (const [code, name] of Object.entries(BRANCHES)) {
        const value = cell(code, latestYear) as number;
        observations.push({
          ...base,
          id: `${iso3.toLowerCase()}-va-${code.toLowerCase()}-${latestYear}`,
          key: `economy.value_added.${code}`,
          topic: "value_added",
          label: name,
          value: value * 1e6,
          unit: "EUR",
          currency: "EUR",
          referencePeriod: latestYear,
          geographicScope: `${geo}, branche ${code}`,
          methodology: `Valeur ajoutée brute de la branche ${code} (${name}) aux prix courants.`,
          sourceIds: [vaSource.id],
          dataKind: "observed",
          calculationFormula: null,
          history: years.filter((year) => cell(code, year) !== null).map((year) => ({ period: year, value: (cell(code, year) as number) * 1e6 })),
        });
        observations.push({
          ...base,
          id: `${iso3.toLowerCase()}-va-share-${code.toLowerCase()}-${latestYear}`,
          key: `economy.value_added_share.${code}`,
          topic: "value_added_share",
          label: name,
          value: Math.round((value / total) * 1000) / 10,
          unit: "%",
          currency: null,
          referencePeriod: latestYear,
          geographicScope: `${geo}, branche ${code}`,
          methodology: `Part de la branche ${code} dans la valeur ajoutée brute totale (valeur calculée à partir de deux observations Eurostat).`,
          sourceIds: [vaSource.id],
          dataKind: "calculated",
          calculationFormula: "valeur ajoutée de la branche / valeur ajoutée totale × 100, arrondi à 0,1 point",
          history: [],
        });
      }
      console.log(`${iso3} valeur ajoutée par branche : ${latestYear}`);
    }
    await sleep(500);

    // --- Dette publique brute (administrations publiques), % du PIB, trimestrielle ---
    const debtUrl = `${API}/gov_10q_ggdebt?format=JSON&lang=EN&geo=${geo}&sector=S13&na_item=GD&unit=PC_GDP&sinceTimePeriod=${new Date().getFullYear() - 3}-Q1`;
    const debt = await getJson(debtUrl);
    const quarters = Object.keys(debt.dimension.time.category.index);
    const debtRows = quarters.flatMap((quarter, index) => (debt.value[String(index)] != null ? [{ period: quarter, value: debt.value[String(index)] as number }] : []));
    if (debtRows.length > 0) {
      const debtSource = source("gov_10q_ggdebt", "Dette publique trimestrielle (administrations publiques, % du PIB)", debtUrl, debt.updated, geo, "Dette brute consolidée de l'ensemble des administrations publiques (S13) rapportée au PIB, série trimestrielle.");
      sources.push(debtSource);
      const latest = debtRows[debtRows.length - 1];
      observations.push({
        ...base,
        id: `${iso3.toLowerCase()}-public-debt-${latest.period.toLowerCase()}`,
        key: "economy.public_debt_gdp",
        topic: "public_debt",
        label: "Dette publique",
        value: latest.value,
        unit: "%",
        currency: null,
        referencePeriod: latest.period,
        geographicScope: `${geo}, administrations publiques (S13)`,
        methodology: "Dette brute consolidée des administrations publiques (au sens de Maastricht) en pourcentage du PIB, dernier trimestre publié.",
        sourceIds: [debtSource.id],
        dataKind: "observed",
        calculationFormula: null,
        history: debtRows,
      });
      console.log(`${iso3} dette publique : ${latest.value} % (${latest.period})`);
    }
    await sleep(500);

    // --- Dépendance aux importations d'énergie, tous produits ---
    const depUrl = `${API}/nrg_ind_id?format=JSON&lang=EN&geo=${geo}&siec=TOTAL&sinceTimePeriod=${new Date().getFullYear() - 6}`;
    const dep = await getJson(depUrl);
    const depYears = Object.keys(dep.dimension.time.category.index);
    const depRows = depYears.flatMap((year, index) => (dep.value[String(index)] != null ? [{ period: year, value: Math.round((dep.value[String(index)] as number) * 10) / 10 }] : []));
    if (depRows.length > 0) {
      const depSource = source("nrg_ind_id", "Dépendance aux importations d'énergie, tous produits énergétiques", depUrl, dep.updated, geo, "Part des besoins énergétiques couverte par les importations nettes (importations nettes rapportées à l'énergie brute disponible, soutes maritimes internationales comprises), tous produits énergétiques.");
      sources.push(depSource);
      const latest = depRows[depRows.length - 1];
      observations.push({
        ...base,
        id: `${iso3.toLowerCase()}-energy-import-dependency-${latest.period}`,
        key: "energy.import_dependency",
        topic: "energy_dependency",
        label: "Dépendance aux importations d'énergie",
        value: latest.value,
        unit: "%",
        currency: null,
        referencePeriod: latest.period,
        geographicScope: `${geo}, tous produits énergétiques`,
        methodology: "Importations nettes d'énergie rapportées à l'énergie brute disponible (soutes maritimes comprises), tous produits. À distinguer du mix électrique, du mix d'énergie primaire et de la consommation finale.",
        sourceIds: [depSource.id],
        dataKind: "observed",
        calculationFormula: null,
        history: depRows,
      });
      console.log(`${iso3} dépendance énergétique : ${latest.value} % (${latest.period})`);
    }

    const out = path.join(process.cwd(), "data", "approche", `${iso3}.eurostat.json`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify({ countryCode: iso3, fetchedAt: today, sources, observations }, null, 2)}\n`);
    console.log(`${observations.length} observations écrites dans ${path.relative(process.cwd(), out)}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
