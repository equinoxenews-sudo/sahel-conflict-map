// Valide un ou plusieurs fichiers de fiche pays « Approche » (schéma version 1) avant leur import dans le dépôt.
// Contrôle : structure (Zod), publicabilité (chaque valeur a une source, aucune source exclue par licence comme SIPRI, aucun contenu
// de démonstration), cohérence des liens entre éléments et sources, et — avec --check-links — que chaque adresse répond.
//
//   npm run approche:validate -- data/approche/FRA.json
//   npm run approche:validate -- fichier.json --check-links
//
// Un fichier valide n'est pas pour autant VRAI : la validation vérifie la forme et les règles de traçabilité, pas l'exactitude.
import fs from "node:fs";
import { CountryDataSchema } from "../lib/approche/schema";
import { publishProblems } from "../lib/approche/sourceRegistry";

const args = process.argv.slice(2);
const checkLinks = args.includes("--check-links");
const files = args.filter((arg) => !arg.startsWith("--"));

/** Messages de structure de Zod en français, pour que l'erreur se lise sans connaître la bibliothèque. */
function frenchMessage(message: string): string {
  if (/received undefined/.test(message)) return "champ obligatoire absent";
  if (/Invalid URL/.test(message)) return "adresse invalide (adresse complète https://… attendue)";
  const items = /expected array to have >=(\d+) items/.exec(message);
  if (items) return `au moins ${items[1]} élément(s) attendu(s)`;
  const length = /expected string to have exactly (\d+) characters/.exec(message);
  if (length) return `exactement ${length[1]} caractères attendus`;
  const option = /expected one of (.+)$/.exec(message);
  if (option) return `valeur non reconnue, attendu : ${option[1]}`;
  if (/expected string to have >=1 characters/.test(message)) return "texte vide interdit";
  if (/expected (number|string|boolean|array|object), received/.test(message)) return `type incorrect (${message.replace(/^Invalid input: /, "")})`;
  return message;
}

async function reachable(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(20_000), headers: { "User-Agent": "Mozilla/5.0 (compatible; EquinoxeNewsBot/1.0)" } });
    return response.ok ? null : `HTTP ${response.status}`;
  } catch (error) {
    return error instanceof Error ? error.message : "injoignable";
  }
}

async function main() {
  if (files.length === 0) throw new Error("Donne au moins un fichier JSON : npm run approche:validate -- data/approche/FRA.json");
  let failed = false;
  for (const file of files) {
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
      console.error(`✖ ${file} : JSON illisible (${error instanceof Error ? error.message : error})`);
      failed = true;
      continue;
    }
    const parsed = CountryDataSchema.safeParse(raw);
    if (!parsed.success) {
      console.error(`✖ ${file} : structure invalide`);
      for (const issue of parsed.error.issues.slice(0, 25)) console.error(`   - ${issue.path.join(".") || "(racine)"} : ${frenchMessage(issue.message)}`);
      if (parsed.error.issues.length > 25) console.error(`   … ${parsed.error.issues.length - 25} autre(s) erreur(s)`);
      failed = true;
      continue;
    }
    const data = parsed.data;
    const problems = publishProblems(data);
    const warnings: string[] = [];
    if (data.publication === "published" && data.lastCheckedAt === null) warnings.push("fiche « published » sans date de dernière vérification (lastCheckedAt)");
    const pending = data.observations.filter((observation) => observation.status === "pending").length;
    const unknownLicense = data.sources.filter((source) => source.reuse === "unknown").length;
    if (unknownLicense > 0) warnings.push(`${unknownLicense} source(s) dont la licence de réutilisation n'est pas vérifiée (reuse: "unknown")`);

    if (checkLinks) {
      const urls = [...new Set([...data.sources.map((source) => source.canonicalUrl), ...data.sources.flatMap((source) => (source.licenseUrl ? [source.licenseUrl] : []))])];
      for (let start = 0; start < urls.length; start += 6) {
        const results = await Promise.all(urls.slice(start, start + 6).map(async (url) => [url, await reachable(url)] as const));
        for (const [url, problem] of results) if (problem) warnings.push(`lien à vérifier : ${url} (${problem})`);
      }
    }

    if (problems.length > 0) {
      console.error(`✖ ${file} : ${problems.length} problème(s) de publication`);
      for (const problem of problems.slice(0, 40)) console.error(`   - ${problem}`);
      failed = true;
    } else {
      console.log(`✔ ${file} : valide (${data.countryCode}, ${data.sources.length} sources, ${data.observations.length} observations, ${data.relationships.length} relations, ${data.claims.length} affirmations${pending ? `, ${pending} en attente` : ""})`);
    }
    for (const warning of warnings) console.warn(`   ! ${warning}`);
  }
  if (failed) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
