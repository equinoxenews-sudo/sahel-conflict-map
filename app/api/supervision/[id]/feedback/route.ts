import { NextResponse } from "next/server";
import { requireSupervisionAccount } from "@/lib/supervision/access";
import { supervisionFailure } from "@/lib/supervision/http";
import { addFeedback, FEEDBACK_KINDS, type FeedbackKind } from "@/lib/supervision/results";
import { getSupervision } from "@/lib/supervision/store";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Retour de l'utilisateur sur une publication : pertinent, non pertinent, doublon, localisation incorrecte, commentaire.
// { "targetType": "item", "targetId": "123", "kind": "irrelevant", "comment": "…" }
export async function POST(request: Request, context: Context) {
  const access = await requireSupervisionAccount();
  if (!access.ok) return access.response;
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Identifiant invalide.", code: "invalid" }, { status: 400 });
  const body = (await request.json().catch(() => null)) as { targetType?: unknown; targetId?: unknown; kind?: unknown; comment?: unknown } | null;
  const targetType = body?.targetType;
  const kind = body?.kind;
  const targetId = typeof body?.targetId === "string" || typeof body?.targetId === "number" ? String(body.targetId) : "";
  if ((targetType !== "item" && targetType !== "event" && targetType !== "report") || !(FEEDBACK_KINDS as readonly unknown[]).includes(kind) || !/^[0-9]{1,18}$/.test(targetId)) {
    return NextResponse.json({ error: "Retour invalide.", code: "invalid" }, { status: 400 });
  }
  try {
    const supervision = await getSupervision(access.account.id, id.toLowerCase());
    if (!supervision) return NextResponse.json({ error: "Veille introuvable.", code: "not_found" }, { status: 404 });
    await addFeedback(access.account.id, supervision.id, {
      targetType,
      targetId,
      kind: kind as FeedbackKind,
      comment: typeof body?.comment === "string" ? body.comment : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return supervisionFailure(error);
  }
}
