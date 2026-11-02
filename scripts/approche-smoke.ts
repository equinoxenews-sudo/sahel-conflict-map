// Contrôle de rendu des fiches pays « Approche » sur un site en marche (serveur local ou préversion) : pour chaque pays enregistré, les
// six onglets répondent, et chaque observation classée « panneau », « autres sources » ou « électricité » apparaît dans la page avec son
// libellé. Ce que le moteur prétend afficher est ainsi vérifié sur le HTML réellement servi.
//
//   npm run approche:smoke -- http://localhost:3000 [ISO3 ...] [--json fichier.json]
import fs from "node:fs";
import { classifyObservations } from "../lib/approche/complements";
import { assessLevel } from "../lib/approche/levels";
import { loadApprocheCountry } from "../lib/approche/repository";
import { APPROCHE_TABS, tabHref } from "../lib/approche/tabs";
import { listCountryFiles } from "./lib/approcheContract";

const norm = (text: string) =>
  text
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[\s  ]+/g, " ");

interface TabResult {
  tab: string;
  status: number;
  panels: number;
  sectionsMissing: string[];
}
interface CountrySmoke {
  code: string;
  name: string;
  slug: string;
  tabs: TabResult[];
  missingLabels: { label: string; where: string }[];
  checkedLabels: number;
  level: string;
  ok: boolean;
}

async function main() {
  const args = process.argv.slice(2);
  const base = (args.find((arg) => /^https?:\/\//.test(arg)) ?? "http://localhost:3000").replace(/\/$/, "");
  const codes = args.filter((arg) => /^[A-Za-z]{3}$/.test(arg)).map((code) => code.toUpperCase());
  const jsonIndex = args.indexOf("--json");
  const jsonFile = jsonIndex >= 0 ? args[jsonIndex + 1] : undefined;
  const root = process.cwd();
  const registered = listCountryFiles(root).map((entry) => entry.code);
  const targets = codes.length > 0 ? codes : registered;
  const results: CountrySmoke[] = [];

  for (const code of targets) {
    const data = loadApprocheCountry(code);
    if (!data) {
      console.error(`✖ ${code} : fiche invalide ou non enregistrée`);
      results.push({ code, name: code, slug: "", tabs: [], missingLabels: [], checkedLabels: 0, level: "—", ok: false });
      continue;
    }
    const basePath = `/zones/${data.zoneSlug}/approche/pays/${data.slug}`;
    const pages = new Map<string, string>();
    const tabs: TabResult[] = [];
    for (const tab of APPROCHE_TABS) {
      const response = await fetch(`${base}${tabHref(basePath, tab.key)}`, { redirect: "follow" });
      const html = response.ok ? await response.text() : "";
      pages.set(tab.key, norm(html));
      const sectionsMissing: string[] = [];
      if (response.ok && !html.includes(data.name)) sectionsMissing.push("nom du pays");
      if (response.ok && tab.key === "overview" && !html.includes("Niveau documentaire")) sectionsMissing.push("niveau documentaire");
      tabs.push({ tab: tab.key, status: response.status, panels: (html.match(/<details/g) ?? []).length, sectionsMissing });
    }
    // Chaque observation classée « panneau », « autres sources » ou « électricité » doit apparaître, avec son libellé, dans la page.
    const placements = classifyObservations(data);
    const missingLabels: { label: string; where: string }[] = [];
    let checked = 0;
    for (const observation of data.observations) {
      const placement = placements.get(observation.id);
      if (!placement || !["panel", "drawer", "electricity"].includes(placement.kind) || !observation.label) continue;
      const expectedTabs = placement.kind === "panel" ? [placement.tab] : placement.kind === "electricity" ? ["economy"] : APPROCHE_TABS.map((tab) => tab.key);
      checked += 1;
      const label = norm(observation.label);
      if (!expectedTabs.some((tab) => (pages.get(tab) ?? "").includes(label))) missingLabels.push({ label: observation.label, where: `${placement.kind} (${expectedTabs.join(", ")})` });
    }
    const ok = tabs.every((tab) => tab.status === 200 && tab.sectionsMissing.length === 0) && missingLabels.length === 0;
    results.push({ code, name: data.name, slug: data.slug, tabs, missingLabels, checkedLabels: checked, level: assessLevel(data).achieved, ok });
    console.log(`${ok ? "✔" : "✖"} ${code} ${data.name} : onglets ${tabs.map((tab) => `${tab.tab}=${tab.status}`).join(" ")} ; libellés retrouvés ${checked - missingLabels.length}/${checked}`);
    for (const item of missingLabels) console.log(`   - introuvable : « ${item.label} » (${item.where})`);
    for (const tab of tabs) if (tab.sectionsMissing.length) console.log(`   - ${tab.tab} : manque ${tab.sectionsMissing.join(", ")}`);
  }
  if (jsonFile) fs.writeFileSync(jsonFile, JSON.stringify(results, null, 2));
  if (results.some((result) => !result.ok)) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
