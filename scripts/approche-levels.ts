// Profil de couverture documentaire de chaque pays enregistré (couverture des contenus, qualité des sources, contenus spécifiques),
// comparé aux autres pays enregistrés. Information pour décider des niveaux « essentiel » / « approfondi » : rien n'est modifié, aucun
// niveau n'est calculé ni affiché (le niveau est une décision éditoriale, voir docs/APPROCHE_NIVEAUX_METHODE.md).
//
//   npm run approche:levels [-- --detail]
import { coverageProfile, LEVEL_LABELS, longTexts, PROPOSED_THRESHOLDS } from "../lib/approche/levels";
import { loadApprocheCountry } from "../lib/approche/repository";
import { listCountryFiles } from "./lib/approcheContract";

const percent = (value: number | null) => (value === null ? "n.d." : `${Math.round(value * 100)} %`);
const detail = process.argv.includes("--detail");
const codes = listCountryFiles(process.cwd()).map((entry) => entry.code);
const loaded = codes.flatMap((code) => {
  const data = loadApprocheCountry(code);
  return data ? [{ code, data }] : [];
});

console.log("| Pays | Couverture des contenus | Qualité des sources | Contenus spécifiques | Niveau déclaré | Seuils proposés (non appliqués) |");
console.log("|---|---|---|---|---|---|");
for (const { code, data } of loaded) {
  const peers = new Set(loaded.filter((other) => other.code !== code).flatMap((other) => longTexts(other.data.modules)));
  const profile = coverageProfile(data, peers.size > 0 ? peers : null);
  console.log(`| ${data.name} (${code}) | ${percent(profile.coverage.score)} | ${percent(profile.sources.score)} | ${percent(profile.specific.score)} | ${data.documentationLevel ? LEVEL_LABELS[data.documentationLevel] : "non déclaré"} | ${profile.suggestion === "incomplete" ? "aucun niveau" : LEVEL_LABELS[profile.suggestion]} |`);
  if (detail) {
    for (const block of profile.coverage.blocks.filter((item) => !item.ok)) console.log(`|  ↳ manque | ${block.label} (${block.detail}) | | | | |`);
    for (const part of profile.sources.parts) console.log(`|  ↳ sources | ${part.label} | ${part.detail} | | | |`);
    for (const part of profile.specific.parts) console.log(`|  ↳ spécifique | ${part.label} | ${part.detail} | | | |`);
  }
}
console.log("");
console.log(`Seuils proposés : essentiel ≥ ${percent(PROPOSED_THRESHOLDS.essential.coverage)} / ${percent(PROPOSED_THRESHOLDS.essential.sources)} / ${percent(PROPOSED_THRESHOLDS.essential.specific)} ; approfondi ≥ ${percent(PROPOSED_THRESHOLDS.extended.coverage)} / ${percent(PROPOSED_THRESHOLDS.extended.sources)} / ${percent(PROPOSED_THRESHOLDS.extended.specific)} (couverture / sources / spécifique).`);
