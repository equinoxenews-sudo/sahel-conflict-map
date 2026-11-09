// Importe l'échantillon public (articles.json, evenements.json) dans la PRÉPRODUCTION.
//
// Garde-fous : refuse de tourner si la base de .env.local n'est pas equinoxe-staging ; n'écrit que dans zone_briefs et
// conflict_events ; rejouable (upsert sur l'identifiant), donc relancer ne duplique rien.
//
// Usage : npx tsx scripts/import-sample-staging.ts <dossier contenant articles.json et evenements.json>

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const STAGING_PROJECT_REF = "upoknwoctatqmlonitzx";
const BATCH = 500;

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error("Usage : tsx scripts/import-sample-staging.ts <dossier>");
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
  const files: [table: string, file: string, conflict: string][] = [
    ["zone_briefs", "articles.json", "id"],
    ["conflict_events", "evenements.json", "id"],
  ];
  for (const [table, file, conflict] of files) {
    const rows = JSON.parse(readFileSync(join(dir, file), "utf8")) as Record<string, unknown>[];
    for (let index = 0; index < rows.length; index += BATCH) {
      const { error } = await admin.from(table).upsert(rows.slice(index, index + BATCH), { onConflict: conflict });
      if (error) throw new Error(`${table} (lot ${index}) : ${error.message}`);
    }
    const { count, error } = await admin.from(table).select("id", { count: "exact", head: true });
    if (error) throw new Error(`${table} : ${error.message}`);
    console.log(`${table} : ${rows.length} lignes importées, ${count} présentes dans la préproduction.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
