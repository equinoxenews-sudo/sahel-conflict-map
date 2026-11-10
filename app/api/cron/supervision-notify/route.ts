import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cronAuth";
import { defaultDeps, notifyScheduled } from "@/lib/supervision/notify/run";

// Notifications programmées des Supervisions (sans IA, aucun coût d'IA) : appelée par Vercel Cron (GET, en-tête « Authorization: Bearer
// <CRON_SECRET> »). Sans secret configuré ou avec un mauvais secret : refusé. Met en file les alertes nouvelles et les digests dus, puis
// envoie les messages arrivés à échéance. En mode « sans envoi » (par défaut), rien ne part : tout est écrit dans le journal.
// Sur le plan Hobby de Vercel, une entrée dans vercel.json ne s'exécute qu'une fois par jour : plusieurs entrées donnent plusieurs passages.
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAuthorizedCron(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const deps = defaultDeps();
    const report = await notifyScheduled(deps);
    if (report.errors.length > 0) console.error(`Notifications programmées : ${report.errors.length} erreur(s) : ${report.errors.map((entry) => `${entry.id} (${entry.reason})`).join("; ")}`);
    return NextResponse.json({ ok: true, mode: deps.mode, ...report }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const missing = /sv_|relation|does not exist|schema cache/i.test(message);
    console.error(`Notifications programmées impossibles : ${message.slice(0, 200)}`);
    return NextResponse.json({ ok: false, error: missing ? "Tables des notifications absentes de cette base." : "Notifications programmées impossibles." }, { status: missing ? 503 : 500, headers: { "Cache-Control": "no-store" } });
  }
}
