// Télécharge un ÉCHANTILLON des données publiques de la production (lecture seule) pour alimenter la préproduction.
//
// Garde-fous :
//  - ne lit QUE deux tables, listées en dur ci-dessous ; aucune autre table n'est interrogée ;
//  - n'envoie que des requêtes GET (aucune écriture possible) ;
//  - la clé est la clé publique « anon » (RLS : lecture publique seulement), passée par variable d'environnement,
//    jamais écrite dans un fichier ;
//  - refuse de tourner si l'URL est celle de la préproduction.
//
// Usage : PROD_URL=https://xxx.supabase.co PROD_ANON_KEY=eyJ… npx tsx scripts/export-public-sample.ts <dossier de sortie> [jours] [max événements]

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const STAGING_REF = "upoknwoctatqmlonitzx";
const PAGE = 1000;

const TABLES = {
  zone_briefs: {
    columns: "id,zone_slug,title,summary,source_urls,source_domains,published_at,countries,primary_theme,secondary_themes,event_type,importance,veracity,category,confidence,confidence_label,claimed_by,source_count,place_name,place_country,latitude,longitude,geo_precision",
    dateColumn: "published_at",
    order: "published_at.desc,id.desc",
    file: "articles.json",
  },
  conflict_events: {
    columns: "id,external_id,event_date,country,latitude,longitude,category,fatalities,source,notes,num_mentions,reliability,summary",
    dateColumn: "event_date",
    order: "event_date.desc,id.desc",
    file: "evenements.json",
  },
} as const;

async function main() {
  const [outDir, daysArg, maxEventsArg] = process.argv.slice(2);
  const url = process.env.PROD_URL?.replace(/\/$/, "");
  const key = process.env.PROD_ANON_KEY;
  if (!outDir || !url || !key) throw new Error("Usage : PROD_URL=… PROD_ANON_KEY=… tsx scripts/export-public-sample.ts <dossier> [jours] [max événements]");
  if (url.includes(STAGING_REF)) throw new Error("Cette URL est celle de la préproduction : ce script lit la production.");

  // La clé doit être publique : on lit son rôle (sans la vérifier), et on refuse tout autre rôle que « anon ».
  const payload = JSON.parse(Buffer.from(key.split(".")[1] ?? "", "base64url").toString("utf8") || "{}");
  if (payload.role !== "anon") throw new Error(`Clé refusée : son rôle est « ${payload.role} », seule la clé publique « anon » est acceptée.`);

  const days = Number(daysArg ?? 45);
  const maxEvents = Number(maxEventsArg ?? 5000);
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  mkdirSync(outDir, { recursive: true });

  for (const [table, spec] of Object.entries(TABLES)) {
    const limit = table === "conflict_events" ? maxEvents : Infinity;
    const rows: unknown[] = [];
    while (rows.length < limit) {
      const take = Math.min(PAGE, limit - rows.length);
      const query = `select=${spec.columns}&${spec.dateColumn}=gte.${since}&order=${spec.order}&limit=${take}&offset=${rows.length}`;
      const response = await fetch(`${url}/rest/v1/${table}?${query}`, { method: "GET", headers: { apikey: key, Authorization: `Bearer ${key}` } });
      if (!response.ok) throw new Error(`${table} : HTTP ${response.status} — ${(await response.text()).slice(0, 300)}`);
      const page = (await response.json()) as unknown[];
      rows.push(...page);
      if (page.length < take) break;
    }
    writeFileSync(join(outDir, spec.file), JSON.stringify(rows), "utf8");
    console.log(`${table} : ${rows.length} lignes depuis le ${since} → ${spec.file}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
