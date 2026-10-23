import { NextResponse, type NextRequest } from "next/server";
import { clampQuery, SEARCH_KINDS, type SearchKind, type SearchResponse } from "@/lib/search";
import { globalSearch } from "@/lib/searchData";

// Recherche globale du site (fenêtre « Recherche globale ») : pays, actualités, analyses, entités.
// Lecture publique uniquement ; aucune donnée privée (Investigation, Mon espace) n'est indexée.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = clampQuery(request.nextUrl.searchParams.get("q") ?? "");
  const rawKind = request.nextUrl.searchParams.get("type");
  const kind = SEARCH_KINDS.find((candidate) => candidate.id === rawKind)?.id as SearchKind | undefined;
  const results = await globalSearch(query, kind);
  const body: SearchResponse = { query, results };
  // Même recherche répétée : servie depuis le cache quelques instants (limite les appels à Supabase).
  return NextResponse.json(body, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
