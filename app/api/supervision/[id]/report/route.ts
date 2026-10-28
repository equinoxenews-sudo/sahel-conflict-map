import { NextResponse } from "next/server";
import { requireSupervisionAccount } from "@/lib/supervision/access";
import { supervisionFailure } from "@/lib/supervision/http";
import { loadLatestReport } from "@/lib/supervision/results";
import { getSupervision } from "@/lib/supervision/store";
import { generateDailyReport, todayIn } from "@/lib/supervision/synthesis";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

type Context = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Une synthèse réussie rédigée depuis moins de ce délai est renvoyée telle quelle : on ne paie pas deux fois la même. */
const REUSE_MS = 10 * 60_000;

// Rédige la synthèse du jour d'une veille du compte connecté : un appel à l'IA, dans le budget du compte, ou un message
// clair (« aucune nouvelle donnée fiable », budget atteint). Jamais de texte inventé.
export async function POST(_request: Request, context: Context) {
  const access = await requireSupervisionAccount();
  if (!access.ok) return access.response;
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Identifiant invalide.", code: "invalid" }, { status: 400 });
  try {
    const supervision = await getSupervision(access.account.id, id.toLowerCase());
    if (!supervision) return NextResponse.json({ error: "Veille introuvable.", code: "not_found" }, { status: 404 });
    const latest = await loadLatestReport(access.account.id, supervision.id);
    const now = new Date();
    if (latest && latest.content.status === "ok" && latest.day === todayIn(access.account.timezone, now) && now.getTime() - Date.parse(latest.createdAt) < REUSE_MS) {
      return NextResponse.json({ report: latest.content, reused: true });
    }
    return NextResponse.json({ report: await generateDailyReport(supervision, access.account, now) });
  } catch (error) {
    return supervisionFailure(error);
  }
}
