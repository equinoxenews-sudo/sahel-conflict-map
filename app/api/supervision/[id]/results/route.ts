import { NextResponse } from "next/server";
import { requireSupervisionAccount } from "@/lib/supervision/access";
import { supervisionFailure } from "@/lib/supervision/http";
import { loadResults } from "@/lib/supervision/results";
import { getSupervision } from "@/lib/supervision/store";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Publications retenues pour une veille du compte connecté (?days=7 pour restreindre la période).
export async function GET(request: Request, context: Context) {
  const access = await requireSupervisionAccount();
  if (!access.ok) return access.response;
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Identifiant invalide.", code: "invalid" }, { status: 400 });
  const days = Number(new URL(request.url).searchParams.get("days"));
  try {
    const supervision = await getSupervision(access.account.id, id.toLowerCase());
    if (!supervision) return NextResponse.json({ error: "Veille introuvable.", code: "not_found" }, { status: 404 });
    return NextResponse.json({ supervision, results: await loadResults(access.account.id, supervision.id, Number.isFinite(days) && days > 0 ? days : undefined) });
  } catch (error) {
    return supervisionFailure(error);
  }
}
