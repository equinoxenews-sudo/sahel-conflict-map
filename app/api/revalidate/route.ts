import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

// Appelée par .github/workflows/zone-synthesis.yml une fois les synthèses de
// zone enregistrées : les pages Actualité sont en cache (revalidate = 3600),
// on les marque périmées pour afficher la synthèse du jour sans attendre.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidatePath("/zones/[slug]/[tab]", "page");
  return NextResponse.json({ ok: true });
}
