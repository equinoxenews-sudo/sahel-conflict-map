// Lance UNE vraie collecte (Google Actualités, sans IA) pour une Supervision de la PRÉPRODUCTION et affiche ce qui a été rattaché.
// Garde-fou : refuse si la base de .env.local n'est pas equinoxe-staging. Usage : npx tsx scripts/collect-real-staging.ts "<nom de la supervision>"
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { collectForSupervision } from "../lib/supervision/collect/run";

const STAGING_PROJECT_REF = "upoknwoctatqmlonitzx";

async function main() {
  const name = process.argv[2];
  if (!name) throw new Error('Usage : tsx scripts/collect-real-staging.ts "<nom>"');
  dotenv.config({ path: ".env.local", quiet: true });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const ref = new URL(url).host.split(".")[0];
  if (ref !== STAGING_PROJECT_REF) throw new Error(`Base « ${ref} » : ce n'est PAS la préproduction.`);
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data: sup, error } = await db.from("sv_supervisions").select("id, owner_id, name").eq("name", name).maybeSingle();
  if (error || !sup) throw new Error(`Supervision « ${name} » introuvable : ${error?.message ?? ""}`);
  const outcome = await collectForSupervision(sup.owner_id, sup.id, { trigger: "manual", minIntervalMinutes: 0 });
  console.log(JSON.stringify(outcome, null, 1));
  const { data: matches } = await db
    .from("sv_matches")
    .select("score, theme, reason, place_name, geo_precision, latitude, longitude, sv_items(title, domain, published_at)")
    .eq("supervision_id", sup.id)
    .order("matched_at", { ascending: false })
    .limit(40);
  for (const m of (matches ?? []) as unknown as { score: number; theme: string; place_name: string | null; geo_precision: string | null; sv_items: { title: string; domain: string } | null }[]) {
    console.log(`[${m.score}] ${m.theme} | ${m.place_name ? `${m.place_name} (${m.geo_precision})` : "— sans position —"} | ${m.sv_items?.domain} | ${m.sv_items?.title}`);
  }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
