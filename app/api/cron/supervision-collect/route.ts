import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cronAuth";
import { collectScheduled } from "@/lib/supervision/collect/schedule";

// Collecte programmée des Supervisions (sans IA, sans coût) : appelée par Vercel Cron (GET, en-tête « Authorization: Bearer <CRON_SECRET> »).
// Sans secret configuré ou avec un mauvais secret : refusé. Plusieurs entrées dans vercel.json (par exemple 6 h, 12 h, 18 h) donnent
// plusieurs passages par jour sur le plan Hobby, qui n'autorise qu'une exécution par jour et par entrée (précision ±59 minutes).
// Chaque Supervision n'est collectée que si son dernier passage date d'au moins 3 heures (règle appliquée par la base).
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAuthorizedCron(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const report = await collectScheduled();
    // Les échecs sont journalisés (raison seulement, jamais de contenu) ; la réponse reste 200 : le planificateur n'a rien à rejouer.
    if (report.failed.length > 0) console.error(`Collecte programmée : ${report.failed.length} échec(s) : ${report.failed.map((entry) => `${entry.id} (${entry.reason})`).join("; ")}`);
    return NextResponse.json({ ok: true, ...report }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const missing = /sv_|relation|does not exist|schema cache/i.test(message);
    console.error(`Collecte programmée impossible : ${message.slice(0, 200)}`);
    return NextResponse.json({ ok: false, error: missing ? "Tables de la Supervision absentes de cette base." : "Collecte programmée impossible." }, { status: missing ? 503 : 500, headers: { "Cache-Control": "no-store" } });
  }
}
