// Garde-fou des médias « Approche » avant la construction du site (npm run prebuild).
//
// - Construction de PRODUCTION (VERCEL_ENV=production, ou --production) : supprime public/approche/demo (les images de démonstration
//   ne doivent pas être servies, même sans être référencées), refuse la construction si une fiche réelle (data/approche/*.json) cite
//   une image dont la licence n'est pas confirmée pour un usage commercial, et si un fichier de public/approche n'est pas déclaré.
// - Autres constructions (preview, local) : ne touche à rien, rappelle seulement ce qui sera retiré en production.
import fs from "node:fs";
import path from "node:path";
import { allowedInProduction } from "../lib/approche/media";

const root = process.cwd();
const production = process.env.VERCEL_ENV === "production" || process.argv.includes("--production");
const publicDir = path.join(root, "public", "approche");
const demoDir = path.join(publicDir, "demo");
const dataDir = path.join(root, "data", "approche");

interface DeclaredAsset {
  id?: string;
  path?: string;
  licenseStatus?: "cleared" | "to_confirm" | "unknown";
  commercialReuseAllowed?: boolean | null;
}

function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? listFiles(path.join(dir, entry.name)) : [path.join(dir, entry.name)]));
}

function declaredAssets(): DeclaredAsset[] {
  if (!fs.existsSync(dataDir)) return [];
  return fs
    .readdirSync(dataDir)
    .filter((name) => name.endsWith(".json"))
    .flatMap((name) => {
      const parsed = JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8")) as { modules?: { media?: { assets?: DeclaredAsset[] } } };
      return parsed.modules?.media?.assets ?? [];
    });
}

const problems: string[] = [];
const assets = declaredAssets();
for (const asset of assets) {
  if (!allowedInProduction({ licenseStatus: asset.licenseStatus ?? "unknown", commercialReuseAllowed: asset.commercialReuseAllowed })) {
    problems.push(`image ${asset.id ?? asset.path} : licence non confirmée pour un usage commercial`);
  }
}
const allowedPaths = new Set(assets.filter((asset) => allowedInProduction({ licenseStatus: asset.licenseStatus ?? "unknown", commercialReuseAllowed: asset.commercialReuseAllowed })).map((asset) => asset.path));
const undeclared = listFiles(publicDir).filter((file) => !file.startsWith(demoDir + path.sep) && !allowedPaths.has("/" + path.relative(path.join(root, "public"), file).split(path.sep).join("/")));
for (const file of undeclared) problems.push(`fichier public non déclaré comme image autorisée : ${path.relative(root, file)}`);

if (production) {
  if (fs.existsSync(demoDir)) {
    fs.rmSync(demoDir, { recursive: true, force: true });
    console.log("Approche : images de démonstration retirées de la construction de production.");
  }
  if (problems.length > 0) {
    console.error("Approche : construction de production refusée.\n" + problems.map((problem) => `  - ${problem}`).join("\n"));
    process.exit(1);
  }
  console.log(`Approche : médias contrôlés (${assets.length} image(s) déclarée(s), toutes autorisées).`);
} else {
  const demoFiles = listFiles(demoDir).length;
  console.log(`Approche : ${demoFiles} image(s) de démonstration présentes (retirées de toute construction de production).`);
  for (const problem of problems) console.warn(`  ! ${problem}`);
}
