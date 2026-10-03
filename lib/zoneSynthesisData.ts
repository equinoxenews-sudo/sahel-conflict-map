import { supabase } from "./supabaseClient";
import type { ZoneSynthesis } from "./zoneSynthesis";

/** Dernière synthèse de zone enregistrée par l'agent ; null s'il n'y en a
 * pas encore (ou si la table n'est pas créée) — le panneau l'indique. */
export async function getLatestZoneSynthesis(zoneSlug: string): Promise<ZoneSynthesis | null> {
  try {
    const { data, error } = await supabase
      .from("zone_syntheses")
      .select("id, zone_slug, generated_at, headline, sections, sources, brief_ids, used_web_search, model")
      .eq("zone_slug", zoneSlug)
      .order("generated_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Failed to load zone_syntheses:", error.message);
      return null;
    }
    return (data?.[0] as ZoneSynthesis | undefined) ?? null;
  } catch (err) {
    console.error("Failed to reach Supabase:", err);
    return null;
  }
}
