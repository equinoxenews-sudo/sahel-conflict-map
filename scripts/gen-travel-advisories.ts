// Génère public/data/travel-advisories.json : le niveau de chaque pays d'après les conseils aux voyageurs de France Diplomatie.
//
// Source : https://www.diplomatie.gouv.fr (contenu sous Licence Ouverte Etalab 2.0, réutilisation avec mention de la source).
// Pour chaque pays, la page « Sécurité » porte une carte des zones de vigilance (JPG) : on mesure la surface de chaque
// couleur de la légende (voir lib/travelAdvisories.ts). Lecture polie : une requête à la fois, avec une pause, et les
// pages que le robots.txt du site autorise. Lancement manuel ou mensuel (GitHub Actions) :
//
//   npx tsx scripts/gen-travel-advisories.ts
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { FLAG_COUNTRIES } from "../lib/countryFlagIndex";
import {
  countMapPixels,
  countryNameOf,
  flagIso2,
  foldName,
  ISO2_BY_SLUG,
  levelFromText,
  mapDateOf,
  mapImagePath,
  readLevels,
  resolveIso3,
  summaryOf,
  zonesSection,
  type Advisory,
  type AdvisoryFile,
} from "../lib/travelAdvisories";

const SITE = "https://www.diplomatie.gouv.fr";
const LIST_URL = `${SITE}/fr/conseils-aux-voyageurs`;
const OUTPUT = path.join(process.cwd(), "public", "data", "travel-advisories.json");
const WORLD = path.join(process.cwd(), "public", "data", "world-countries.geo.json");
const PAUSE_MS = 450;
const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; EquinoxeNewsBot/1.0; +https://sahel-conflict-map.vercel.app)" };
const NOT_COUNTRIES = new Set(["alertes", "dernieres-minutes"]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function get(url: string): Promise<Response> {
  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response;
}

/** Liste des pays : le menu déroulant de la page d'accueil des conseils aux voyageurs. */
async function listSlugs(): Promise<string[]> {
  const html = await (await get(LIST_URL)).text();
  const slugs = [...new Set([...html.matchAll(/information-par-pays\/([a-z0-9-]+)/g)].map((match) => match[1]))].filter((slug) => !NOT_COUNTRIES.has(slug));
  if (slugs.length < 150) throw new Error(`Liste des pays suspecte (${slugs.length} entrées) : la page a peut-être changé.`);
  return slugs;
}

async function main() {
  const geo = JSON.parse(fs.readFileSync(WORLD, "utf8")) as { features: { id: string; properties: { name: string } }[] };
  const geoByName = new Map(geo.features.map((feature) => [foldName(feature.properties.name), feature.id]));
  const iso2ByFrenchName = new Map(FLAG_COUNTRIES.map((country) => [foldName(country.name), country.iso2]));
  const english = new Intl.DisplayNames(["en"], { type: "region" });

  const slugs = await listSlugs();
  console.log(`${slugs.length} pays à lire.`);
  const advisories: Advisory[] = [];
  const skipped: string[] = [];

  for (const slug of slugs) {
    const url = `${SITE}/fr/information-par-pays/${slug}/conseils-aux-voyageurs-securite`;
    try {
      const html = await (await get(url)).text();
      await sleep(PAUSE_MS);
      const name = countryNameOf(html) || slug;
      const iso2 = ISO2_BY_SLUG[slug] ?? flagIso2(html) ?? iso2ByFrenchName.get(foldName(name)) ?? null;
      const imagePath = mapImagePath(html);
      if (!iso2) {
        skipped.push(`${slug} (code pays inconnu)`);
        continue;
      }
      const iso3 = resolveIso3(iso2, english.of(iso2) ?? "", geoByName);
      if (!iso3) {
        skipped.push(`${slug} (${iso2} absent du fond de carte)`);
        continue;
      }
      let reading: ReturnType<typeof readLevels> = null;
      if (imagePath) {
        const image = Buffer.from(await (await get(new URL(imagePath, SITE).toString())).arrayBuffer());
        await sleep(PAUSE_MS);
        const { data, info } = await sharp(image).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        reading = readLevels(countMapPixels(data, info.width, info.height));
      } else {
        // Page sans carte (l'Ukraine) : seul un « formellement déconseillé » sans aucun autre niveau cité vaut pour tout le pays.
        reading = levelFromText(zonesSection(html));
      }
      if (!reading) {
        skipped.push(`${slug} (carte inexploitable)`);
        continue;
      }
      advisories.push({
        iso2,
        iso3,
        slug,
        name,
        level: reading.level,
        worst: reading.worst,
        partial: reading.partial,
        shares: reading.shares,
        summary: summaryOf(zonesSection(html)),
        url,
        mapDate: imagePath ? mapDateOf(imagePath) : null,
      });
    } catch (error) {
      skipped.push(`${slug} (${error instanceof Error ? error.message : String(error)})`);
    }
  }

  advisories.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const file: AdvisoryFile = {
    updatedAt: new Date().toISOString(),
    source: "Ministère de l'Europe et des Affaires étrangères — France Diplomatie, Conseils aux voyageurs",
    licence: "Licence Ouverte Etalab 2.0",
    advisories,
  };
  // Un fichier qui perdrait la moitié des pays n'écrase jamais le précédent : mieux vaut des données un peu anciennes.
  if (advisories.length < 120) throw new Error(`Seulement ${advisories.length} pays lus : le fichier existant est conservé.`);
  fs.writeFileSync(OUTPUT, `${JSON.stringify(file)}\n`);
  console.log(`${advisories.length} pays écrits dans ${path.relative(process.cwd(), OUTPUT)}.`);
  if (skipped.length > 0) console.log(`Ignorés (${skipped.length}) : ${skipped.join(" ; ")}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
