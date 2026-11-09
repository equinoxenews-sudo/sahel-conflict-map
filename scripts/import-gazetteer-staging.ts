// Importe le dictionnaire de lieux GeoNames (un fichier par pays) dans la PRÉPRODUCTION, pour la localisation des publications collectées.
//
// Garde-fous : refuse de tourner si la base de .env.local n'est pas equinoxe-staging ; n'écrit que dans sv_place_names ; rejouable
// (upsert), donc relancer ne duplique rien. Les fichiers viennent de https://download.geonames.org/export/dump/<PAYS>.zip (CC BY 4.0).
//
// Usage : npx tsx scripts/import-gazetteer-staging.ts <dossier> <PAYS> [<PAYS>…]      ex. … C:/…/geonames ML NG SD ET
// Le dossier contient un sous-dossier par pays avec <PAYS>.txt (le fichier décompressé).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { parseGeonamesLine } from "../lib/supervision/geo/gazetteer";

const STAGING_PROJECT_REF = "upoknwoctatqmlonitzx";
const BATCH = 1000;

async function main() {
  const [dir, ...countries] = process.argv.slice(2);
  if (!dir || countries.length === 0) throw new Error("Usage : tsx scripts/import-gazetteer-staging.ts <dossier> <PAYS> [<PAYS>…]");
  dotenv.config({ path: ".env.local", quiet: true });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const ref = (() => {
    try {
      return new URL(url).host.split(".")[0];
    } catch {
      return "";
    }
  })();
  if (!url || !serviceKey) throw new Error("Variables Supabase absentes de .env.local.");
  if (ref !== STAGING_PROJECT_REF) throw new Error(`Base « ${ref} » : ce n'est PAS la préproduction, import refusé.`);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  for (const raw of countries) {
    const country = raw.toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) throw new Error(`Code pays invalide : ${raw}`);
    const rows = readFileSync(join(dir, country, `${country}.txt`), "utf8").split("\n").filter(Boolean).flatMap(parseGeonamesLine);
    for (let index = 0; index < rows.length; index += BATCH) {
      const { error } = await admin.from("sv_place_names").upsert(rows.slice(index, index + BATCH), { onConflict: "geoname_id,name_key" });
      if (error) throw new Error(`${country} (lot ${index}) : ${error.message}`);
    }
    const { count, error } = await admin.from("sv_place_names").select("geoname_id", { count: "exact", head: true }).eq("country", country);
    if (error) throw new Error(`${country} : ${error.message}`);
    console.log(`${country} : ${rows.length} noms de lieux importés, ${count} présents dans la préproduction.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
