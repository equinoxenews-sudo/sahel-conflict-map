// Régénère les fichiers du contrat de données « Approche » (JSON Schema, dictionnaire des champs, rapport des clés lues par l'interface)
// à partir du code. À relancer après toute modification des schémas ou des composants ; un test vérifie qu'ils sont à jour.
//
//   npm run approche:contract
import fs from "node:fs";
import path from "node:path";
import { buildContractFiles } from "./lib/approcheContract";

const root = process.cwd();
for (const [relative, content] of Object.entries(buildContractFiles(root))) {
  fs.writeFileSync(path.join(root, relative), content);
  console.log(`écrit : ${relative}`);
}
