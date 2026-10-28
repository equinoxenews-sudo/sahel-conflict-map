import { NextResponse } from "next/server";
import { collectSupervisions } from "@/lib/supervision/collect";
import { requireSupervisionAccount } from "@/lib/supervision/access";
import { supervisionFailure } from "@/lib/supervision/http";
import { getSupervision } from "@/lib/supervision/store";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Context = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Délai minimal entre deux collectes demandées à la main sur une même veille. */
const COOLDOWN_MS = 5 * 60_000;

// Lance la collecte d'une veille ACTIVE appartenant au compte connecté. Utile avant que la collecte automatique tourne
// chaque jour, et pour relancer un passage échoué : le traitement ne crée jamais de doublon.
export async function POST(_request: Request, context: Context) {
  const access = await requireSupervisionAccount();
  if (!access.ok) return access.response;
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Identifiant invalide.", code: "invalid" }, { status: 400 });
  try {
    const supervision = await getSupervision(access.account.id, id.toLowerCase());
    if (!supervision) return NextResponse.json({ error: "Veille introuvable.", code: "not_found" }, { status: 404 });
    if (supervision.status !== "active") return NextResponse.json({ error: "Active d'abord la veille pour la lancer.", code: "invalid" }, { status: 409 });
    if (supervision.lastRunAt && Date.now() - Date.parse(supervision.lastRunAt) < COOLDOWN_MS) {
      return NextResponse.json({ error: "Une collecte vient d'avoir lieu : réessaie dans quelques minutes.", code: "limit" }, { status: 429 });
    }
    const [summary] = await collectSupervisions({ ownerId: access.account.id, supervisionId: supervision.id });
    return NextResponse.json({ summary });
  } catch (error) {
    return supervisionFailure(error);
  }
}
