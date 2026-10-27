import { NextResponse } from "next/server";
import { requireSupervisionAccount } from "@/lib/supervision/access";
import { supervisionFailure } from "@/lib/supervision/http";
import { activeLimit, validateSupervisionInput } from "@/lib/supervision/model";
import { createSupervision, listSupervisions } from "@/lib/supervision/store";

export const dynamic = "force-dynamic";

// Les veilles du compte connecté (jamais celles d'un autre) et ce que son offre permet.
export async function GET() {
  const access = await requireSupervisionAccount();
  if (!access.ok) return access.response;
  try {
    const supervisions = await listSupervisions(access.account.id);
    return NextResponse.json({ supervisions, activeLimit: activeLimit(access.account.tier), tier: access.account.tier });
  } catch (error) {
    return supervisionFailure(error);
  }
}

// Crée une veille en brouillon après validation des critères.
export async function POST(request: Request) {
  const access = await requireSupervisionAccount();
  if (!access.ok) return access.response;
  const checked = validateSupervisionInput(await request.json().catch(() => null));
  if (!checked.ok) return NextResponse.json({ error: checked.errors.join(" "), errors: checked.errors, code: "invalid" }, { status: 400 });
  try {
    const supervision = await createSupervision(access.account.id, access.account.tier, checked.value);
    return NextResponse.json({ supervision }, { status: 201 });
  } catch (error) {
    return supervisionFailure(error);
  }
}
