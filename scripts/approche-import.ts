// Importe un lot de fiches pays « Approche » (5 à 10 fichiers JSON à la fois) : contrôle chaque fichier, rédige un rapport par pays,
// puis, avec --apply, enregistre les pays sans erreur (copie dans data/approche/, séries Banque mondiale, registre généré).
// Aucune modification manuelle de repository.ts : le registre est généré à partir de data/approche/.
//
//   npm run approche:import -- C:/chemin/vers/dossier-ou-fichiers            (simulation : rien n'est écrit)
//   npm run approche:import -- dossier --check-links                          (contrôle aussi les adresses des sources)
//   npm run approche:import -- dossier --apply --worldbank --report rapport.md
//
// Options : --apply (enregistre les pays sans erreur), --worldbank (récupère leurs séries Banque mondiale, réseau requis),
// --check-links, --replace (remplace un pays déjà enregistré), --report <fichier.md>, --json <fichier.json>.
// Un pays avec au moins une erreur n'est JAMAIS enregistré, même partiellement ; la publication reste celle du fichier (draft
// pour un lot en relecture) : l'import ne publie rien.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { analyzeCountry, checkBatch, checkUrls, moduleStrings, registeredCountries, renderReport, urlsOf, type CountryReport } from "./lib/approcheImport";
import { buildContractFiles } from "./lib/approcheContract";

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const flagsWithValue = new Set(["--report", "--json"]);
  const inputs = args.filter((arg, index) => !arg.startsWith("--") && !flagsWithValue.has(args[index - 1] ?? ""));
  const apply = args.includes("--apply");
  const replace = args.includes("--replace");
  const root = process.cwd();
  if (inputs.length === 0) throw new Error("Donne un dossier ou des fichiers JSON (ex. npm run approche:import -- C:/Downloads/lot1).");

  const files = inputs.flatMap((input) => {
    const stat = fs.statSync(input);
    return stat.isDirectory() ? fs.readdirSync(input).filter((name) => /^[A-Za-z]{3}\.json$/.test(name)).map((name) => path.join(input, name)) : [input];
  });
  if (files.length === 0) throw new Error("Aucun fichier <ISO3>.json trouvé.");
  if (files.length > 12) console.warn(`! ${files.length} fichiers : l'import est prévu pour des lots de 5 à 10 pays.`);

  const registered = registeredCountries(root);
  const analyzed: { report: CountryReport; slug: string; raw: unknown; file: string }[] = [];
  for (const file of files) {
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
      const report: CountryReport = analyzeCountry({}, file, { root, registered });
      report.errors.schema = [`JSON illisible : ${error instanceof Error ? error.message : String(error)}`];
      report.ok = false;
      analyzed.push({ report, slug: "", raw: null, file });
      continue;
    }
    const slug = (raw as { slug?: string }).slug ?? "";
    // Un pays déjà enregistré n'est remplacé que sur demande (--replace) : sinon l'import le refuse.
    const report = analyzeCountry(raw, file, { root, registered });
    const code = report.code;
    if (!replace && registered.some((entry) => entry.code === code)) {
      report.errors.registry.push(`pays ${code} déjà enregistré (data/approche/${code}.json) : relancer avec --replace pour le remplacer`);
      report.ok = false;
    }
    analyzed.push({ report, slug, raw, file });
  }
  checkBatch(analyzed.map(({ report, slug, raw }) => ({ report, slug, strings: moduleStrings((raw as { modules?: unknown } | null)?.modules) })));

  if (args.includes("--check-links")) {
    console.log("Contrôle des adresses des sources…");
    for (const item of analyzed) if (item.raw) item.report.urls = await checkUrls(urlsOf(item.raw));
  }

  // Enregistrement des pays sans erreur.
  if (apply) {
    const accepted = analyzed.filter((item) => item.report.ok);
    for (const item of accepted) fs.copyFileSync(item.file, path.join(root, "data", "approche", `${item.report.code}.json`));
    if (args.includes("--worldbank") && accepted.length > 0) {
      const codes = accepted.map((item) => item.report.code);
      const result = spawnSync("npx", ["tsx", "scripts/sync-approche-worldbank.ts", ...codes], { cwd: root, stdio: "inherit", shell: true });
      if (result.status !== 0) console.warn("! La récupération des séries Banque mondiale a échoué : les tuiles resteront « Donnée non disponible » ; relancer scripts/sync-approche-worldbank.ts.");
      // Contrôle réel des collisions, maintenant que les séries automatiques sont là.
      const after = registeredCountries(root);
      for (const item of accepted) {
        const recheck = analyzeCountry(item.raw, item.file, { root, registered: after });
        item.report.errors.collisions = recheck.errors.collisions;
        item.report.errors.publication = recheck.errors.publication;
        item.report.automatic = recheck.automatic;
        item.report.ok = Object.values(item.report.errors).every((list) => list.length === 0);
        if (!item.report.ok) console.error(`✖ ${item.report.code} : erreur après fusion avec les séries automatiques (voir le rapport). Le fichier reste dans data/approche/ : le corriger ou le retirer avant de continuer.`);
      }
    }
    for (const [relative, content] of Object.entries(buildContractFiles(root))) fs.writeFileSync(path.join(root, relative), content);
    console.log(`Registre régénéré (${accepted.length} pays enregistré(s) : ${accepted.map((item) => item.report.code).join(", ") || "aucun"}).`);
  }

  const reports = analyzed.map((item) => item.report);
  const text = renderReport(reports, { generatedAt: new Date().toISOString().slice(0, 16).replace("T", " "), applied: apply });
  const reportFile = option("--report");
  if (reportFile) fs.writeFileSync(reportFile, text);
  else console.log(text);
  const jsonFile = option("--json");
  if (jsonFile) fs.writeFileSync(jsonFile, JSON.stringify(reports, null, 2));
  for (const report of reports) console.log(`${report.ok ? "✔" : "✖"} ${report.code} ${report.name} : ${Object.values(report.errors).flat().length} erreur(s), ${report.warnings.length} avertissement(s)`);
  if (reports.some((report) => !report.ok)) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
