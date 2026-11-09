// Affiche les publications rattachées à une Supervision de la PRÉPRODUCTION (lecture seule).
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
async function main() {
  dotenv.config({ path: ".env.local", quiet: true });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (new URL(url).host.split(".")[0] !== "upoknwoctatqmlonitzx") throw new Error("Pas la préproduction.");
  const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", { auth: { persistSession: false } });
  const { data: sup } = await db.from("sv_supervisions").select("id").eq("name", process.argv[2]).maybeSingle();
  const { data: matches, error } = await db.from("sv_matches").select("item_id, score, theme, place_name, geo_precision").eq("supervision_id", sup?.id).order("score", { ascending: false }).limit(60);
  if (error) throw new Error(error.message);
  const { data: items } = await db.from("sv_items").select("id, title, source_name").in("id", (matches ?? []).map((m) => m.item_id));
  const byId = new Map((items ?? []).map((i) => [i.id, i]));
  for (const m of matches ?? []) {
    const i = byId.get(m.item_id);
    console.log(`[${m.score}] ${m.theme} | ${m.place_name ? `${m.place_name} (${m.geo_precision})` : "—"} | ${i?.source_name} | ${i?.title}`);
  }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
