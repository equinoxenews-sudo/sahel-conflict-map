import { NextResponse } from "next/server";
import { collectSupervisions, MAX_HISTORY_DAYS } from "@/lib/supervision/collect";
import { requireSupervisionAccount } from "@/lib/supervision/access";
import { supervisionFailure } from "@/lib/supervision/http";
import { getSupervision } from "@/lib/supervision/store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Context = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Délai minimal entre deux collectes demandées à la main sur une même veille. */
const COOLDOWN_MS = 5 * 60_000;
/** Délai pour un chargement d'historique : on l'enchaîne pour trier la suite. */
const HISTORY_COOLDOWN_MS = 60_000;

// Lance la collecte d'une veille ACTIVE appartenant au compte connecté. Utile avant que la collecte automatique tourne
// chaque jour, et pour relancer un passage échoué : le traitement ne crée jamais de doublon.
export async function POST(request: Request, context: Context) {
  const access = await requireSupervisionAccount();
  if (!access.ok) return access.response;
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Identifiant invalide.", code: "invalid" }, { status: 400 });
  try {
    const supervision = await getSupervision(access.account.id, id.toLowerCase());
    if (!supervision) return NextResponse.json({ error: "Veille introuvable.", code: "not_found" }, { status: 404 });
    if (supervision.status !== "active") return NextResponse.json({ error: "Active d'abord la veille pour la lancer.", code: "invalid" }, { status: 409 });
    // Corps facultatif { days } : charge un historique de 30 à 365 jours (premier regard sur une veille).
    const body = (await request.json().catch(() => null)) as { days?: unknown } | null;
    const historyDays = typeof body?.days === "number" && Number.isFinite(body.days) ? Math.min(MAX_HISTORY_DAYS, Math.max(30, Math.round(body.days))) : undefined;
    const cooldown = historyDays && historyDays > 30 ? HISTORY_COOLDOWN_MS : COOLDOWN_MS;
    if (supervision.lastRunAt && Date.now() - Date.parse(supervision.lastRunAt) < cooldown) {
      return NextResponse.json({ error: "Une collecte vient d'avoir lieu : réessaie dans quelques minutes.", code: "limit" }, { status: 429 });
    }
    const [summary] = await collectSupervisions({ ownerId: access.account.id, supervisionId: supervision.id, historyDays });
    return NextResponse.json({ summary });
  } catch (error) {
    return supervisionFailure(error);
  }
}
