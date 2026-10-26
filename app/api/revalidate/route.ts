import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cronAuth";

// Appelée par .github/workflows/zone-synthesis.yml une fois les synthèses de
// zone enregistrées : les pages Actualité sont en cache (revalidate = 3600),
// on les marque périmées pour afficher la synthèse du jour sans attendre.
export async function GET(request: Request) {
  if (!isAuthorizedCron(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidatePath("/zones/[slug]/[tab]", "page");
  revalidatePath("/zones/[slug]", "page");
  revalidatePath("/briefs/[id]", "page");
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
