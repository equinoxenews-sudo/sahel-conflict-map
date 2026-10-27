import { NextResponse } from "next/server";
import { privateAccessOpen } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { safeHttpUrl } from "@/lib/veilleOsint";

export const dynamic = "force-dynamic";

/** Nombre de vignettes de la veille affichées dans le Menu (l'historique complet reste en base). */
const SHOWN = 20;

// Veille OSINT et IA du Menu de « Mon espace » : les articles choisis chaque dimanche (scripts/veille-osint.ts).
// Classés par date de parution de l'article, du plus récent (à gauche) au plus ancien. Réservé au compte connecté.
export async function GET() {
  if (!(await privateAccessOpen())) {
    return NextResponse.json({ error: "Connexion requise.", code: "locked" }, { status: 401 });
  }
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("veille_osint")
      .select("id, url, source_name, title_fr, summary_fr, image_url, published_at, picked_at")
      .order("published_at", { ascending: false })
      .order("picked_at", { ascending: false })
      .limit(SHOWN);
    if (error) throw new Error(error.message);
    const items = (data ?? []).flatMap((row) => {
      const url = safeHttpUrl(row.url);
      if (!url) return [];
      return [
        {
          id: row.id as number,
          url,
          source: row.source_name as string,
          title: row.title_fr as string,
          summary: row.summary_fr as string,
          imageUrl: safeHttpUrl(row.image_url as string | null),
          publishedAt: row.published_at as string,
          pickedAt: row.picked_at as string,
        },
      ];
    });
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const missing = /veille_osint|relation|does not exist|schema cache/i.test(message);
    return NextResponse.json(
      {
        error: missing ? "La table de la veille n'existe pas : exécuter supabase/add-veille-osint.sql dans Supabase." : "Veille indisponible pour le moment.",
        code: missing ? "no_table" : "error",
      },
      { status: missing ? 503 : 500 },
    );
  }
}
