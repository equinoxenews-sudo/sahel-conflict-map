import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cronAuth";
import { MAX_PROBE_URLS, probePages } from "@/lib/pageFetchProbe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Étape 3 du chantier Synthèses du jour (lib/pageFetchProbe.ts) : télécharge un échantillon
// de pages d'articles récents depuis Vercel et renvoie le résultat de chaque page.
// Appelée par .github/workflows/page-fetch-compare.yml. Lecture seule : aucune écriture en
// base, aucun appel au modèle. L'échantillon est choisi ici, dans la table articles :
// la route ne télécharge jamais une adresse reçue de l'extérieur.
export const maxDuration = 120;

const SYNTHESIS_ZONES = ["afrique", "europe", "moyen-orient", "indopacifique", "amerique-du-sud"];

export async function GET(request: Request) {
  if (!isAuthorizedCron(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const perZone = Math.min(Math.max(Number(params.get("per_zone")) || 12, 1), Math.floor(MAX_PROBE_URLS / SYNTHESIS_ZONES.length));
  const hours = Math.min(Math.max(Number(params.get("hours")) || 72, 1), 24 * 14);
  const since = new Date(Date.now() - hours * 3600_000).toISOString();

  const supabase = getSupabaseAdmin();
  const urls: string[] = [];
  for (const zone of SYNTHESIS_ZONES) {
    const { data, error } = await supabase
      .from("articles")
      .select("url")
      .eq("zone_slug", zone)
      .gte("published_at", since)
      .order("published_at", { ascending: false })
      .limit(perZone);
    if (error) return NextResponse.json({ ok: false, error: `Lecture des articles (${zone}) : ${error.message}` }, { status: 500 });
    for (const row of (data ?? []) as { url: string }[]) {
      if (/^https?:\/\//.test(row.url) && !urls.includes(row.url)) urls.push(row.url);
    }
  }

  const started = Date.now();
  const results = await probePages(urls);
  return NextResponse.json({ ok: true, hours, perZone, durationMs: Date.now() - started, results });
}
