// Exporte le schéma d'une fiche pays « Approche » au format JSON Schema (docs/approche.schema.v1.json), pour que ChatGPT ou tout
// autre outil produise des fichiers conformes sans connaître le code. À relancer après toute modification des schémas.
//
//   npm run approche:schema
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { CountryDataSchema } from "../lib/approche/schema";

const out = path.join(process.cwd(), "docs", "approche.schema.v1.json");
const schema = z.toJSONSchema(CountryDataSchema, { io: "input", unrepresentable: "any" });
fs.writeFileSync(out, `${JSON.stringify(schema, null, 2)}\n`);
console.log(`Schéma écrit dans ${path.relative(process.cwd(), out)}`);
