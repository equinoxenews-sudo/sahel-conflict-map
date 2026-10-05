// Rattrapage des images : pour chaque synthèse récente qui n'a que
// l'illustration générique de sa zone (ou rien), cherche la vraie image de ses
// articles sources — d'abord celle du flux RSS enregistrée avec l'article,
// sinon celle de la page de l'article. Une image déjà utilisée par une autre
// synthèse n'est jamais réutilisée (même règle que lib/briefImages.ts).
// Lancé à la main par .github/workflows/backfill-images.yml. Usage local :
//   npx tsx scripts/backfill-brief-images.ts [--days=90] [--dry-run]
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(process.cwd(), ".env.local") });

for (const name of ["SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL"]) {
  const value = process.env[name];
  if (value) process.env[name] = value.trim().replace(/^["']|["']$/g, "");
}
if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

import { fetchArticleContent } from "../lib/articleSummary";
import { mapWithConcurrency } from "../lib/gdelt";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";

const args = process.argv.slice(2);
const days = Number(args.find((a) => a.startsWith("--days="))?.slice("--days=".length)) || 90;
const dryRun = args.includes("--dry-run");
const CONCURRENCY = 4;

interface BriefRow {
  id: number;
  zone_slug: string;
  title: string;
  image_url: string | null;
  source_urls: string[];
}

const isGeneric = (url: string | null) => !url || url.startsWith("/equinoxe/hero-");

async function main() {
  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const { data, error } = await supabase
    .from("zone_briefs")
    .select("id, zone_slug, title, image_url, source_urls")
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`Lecture des synthèses impossible : ${error.message}`);

  const briefs = (data ?? []) as BriefRow[];
  const used = new Set(briefs.map((b) => b.image_url).filter((u): u is string => !isGeneric(u)));
  const todo = briefs.filter((b) => isGeneric(b.image_url) && b.source_urls.length > 0);
  console.log(`${briefs.length} synthèses sur ${days} jours, ${todo.length} sans vraie image.`);

  // Images de flux déjà enregistrées avec les articles (colonne optionnelle).
  const feedImages = new Map<string, string>();
  const urls = [...new Set(todo.flatMap((b) => b.source_urls))];
  for (let i = 0; i < urls.length; i += 100) {
    const { data: rows, error: articleError } = await supabase
      .from("articles")
      .select("url, image_url")
      .in("url", urls.slice(i, i + 100));
    if (articleError) {
      console.warn(`Images de flux indisponibles (${articleError.message}) : lecture des pages seulement.`);
      break;
    }
    for (const row of (rows ?? []) as { url: string; image_url: string | null }[]) {
      if (row.image_url) feedImages.set(row.url, row.image_url);
    }
  }

  const results = await mapWithConcurrency(todo, CONCURRENCY, async (brief) => {
    const candidates: string[] = [];
    for (const url of brief.source_urls) {
      const page = (await fetchArticleContent(url)).imageUrl;
      if (page) candidates.push(page);
      const feed = feedImages.get(url);
      if (feed) candidates.push(feed);
    }
    const chosen = candidates.find((url) => !used.has(url));
    if (!chosen) return false;
    used.add(chosen);
    if (!dryRun) {
      const { error: updateError } = await supabase.from("zone_briefs").update({ image_url: chosen }).eq("id", brief.id);
      if (updateError) throw new Error(`Mise à jour impossible (#${brief.id}) : ${updateError.message}`);
    }
    console.log(`  #${brief.id} ${brief.title.slice(0, 60)} → ${chosen}`);
    return true;
  });
  const updated = results.filter(Boolean).length;
  console.log(`${dryRun ? "(simulation) " : ""}${updated} synthèse(s) mise(s) à jour sur ${todo.length}.`);
  if (process.env.GITHUB_ACTIONS) console.log(`::notice title=Images::${updated} synthèse(s) sur ${todo.length} ont retrouvé une vraie image.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
