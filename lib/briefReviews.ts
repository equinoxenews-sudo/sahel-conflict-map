import { getZone } from "./zones";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { sendToNicolas } from "./telegramBot";

// Articles « à trancher » (supabase/add-brief-reviews.sql) : l'analyste doute de
// la pertinence ou de la fiabilité d'une information ; l'article attend la
// décision de Nicolas, demandée par Telegram, avant toute publication.

const ANALYST_BY_ZONE: Record<string, string> = {
  afrique: "Gabriel",
  europe: "Alexander",
  "moyen-orient": "Leïla",
  indopacifique: "Adrian",
  "amerique-du-sud": "Belinda",
};

let ready: boolean | null = null;

/** Table présente ? Sinon, un article douteux est publié comme avant (pas de blocage). */
export async function reviewsReady(): Promise<boolean> {
  if (ready !== null) return ready;
  const { error } = await getSupabaseAdmin().from("brief_reviews").select("id").limit(1);
  if (error) console.warn("Articles à trancher : appliquer supabase/add-brief-reviews.sql ; publication directe en attendant.");
  ready = !error;
  return ready;
}

export function reviewMessage(r: { zone: string; title: string; doubt: string; confidence?: number | null; label?: string | null; sources: string[] }): string {
  const analyst = ANALYST_BY_ZONE[r.zone] ?? "L'analyste";
  const zone = getZone(r.zone)?.name ?? r.zone;
  const conf = r.confidence != null && r.label ? `\nConfiance : ${r.label} (${r.confidence} %)` : "";
  return `❓ ${analyst} (${zone}) a un doute — à toi de trancher\n\n« ${r.title} »${conf}\nSources : ${r.sources.join(", ") || "aucune"}\n\nDoute : ${r.doubt}`;
}

/** Met l'article en attente et prévient Nicolas. */
export async function holdForReview(zoneSlug: string, payload: Record<string, unknown>, doubt: string): Promise<number> {
  const db = getSupabaseAdmin();
  const title = String(payload.title ?? "Sans titre");
  const { data, error } = await db
    .from("brief_reviews")
    .insert({ zone_slug: zoneSlug, title, doubt, payload })
    .select("id")
    .single();
  if (error) throw new Error(`Article à trancher non enregistré : ${error.message}`);
  const messageId = await sendToNicolas(
    reviewMessage({
      zone: zoneSlug,
      title,
      doubt,
      confidence: payload.confidence as number | null,
      label: payload.confidence_label as string | null,
      sources: (payload.source_domains as string[]) ?? [],
    }),
    [[
      { text: "✅ Publier", callback_data: `rv:pub:${data.id}` },
      { text: "🗑 Ne pas publier", callback_data: `rv:rej:${data.id}` },
    ]],
  );
  if (messageId) await db.from("brief_reviews").update({ telegram_message_id: messageId }).eq("id", data.id);
  return data.id;
}

/** Décision de Nicolas : publie (copie dans zone_briefs) ou écarte. Idempotent. */
export async function decideReview(id: number, publish: boolean): Promise<{ ok: boolean; message: string; title?: string; messageId?: number | null }> {
  const db = getSupabaseAdmin();
  const { data: review, error } = await db
    .from("brief_reviews")
    .select("id, title, status, payload, telegram_message_id")
    .eq("id", id)
    .maybeSingle();
  if (error || !review) return { ok: false, message: "Article introuvable." };
  if (review.status !== "pending") {
    return { ok: true, message: review.status === "published" ? "Déjà publié." : "Déjà écarté.", title: review.title, messageId: review.telegram_message_id };
  }
  let briefId: number | null = null;
  if (publish) {
    const { data: brief, error: insertError } = await db.from("zone_briefs").insert(review.payload).select("id").single();
    if (insertError) return { ok: false, message: `Publication impossible : ${insertError.message}` };
    briefId = brief.id;
  }
  await db
    .from("brief_reviews")
    .update({ status: publish ? "published" : "rejected", decided_at: new Date().toISOString(), brief_id: briefId })
    .eq("id", id)
    .eq("status", "pending");
  return { ok: true, message: publish ? "Publié sur le site." : "Écarté, rien n'est publié.", title: review.title, messageId: review.telegram_message_id };
}
