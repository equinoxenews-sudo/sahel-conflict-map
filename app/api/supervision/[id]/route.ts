import { NextResponse } from "next/server";
import { requireSupervisionAccount } from "@/lib/supervision/access";
import { supervisionFailure } from "@/lib/supervision/http";
import { STATUSES, validateSupervisionInput, type Status } from "@/lib/supervision/model";
import { deleteSupervision, getSupervision, setSupervisionStatus, updateSupervision } from "@/lib/supervision/store";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function parseId(context: Context): Promise<string | null> {
  const { id } = await context.params;
  return UUID.test(id) ? id.toLowerCase() : null;
}

const BAD_ID = () => NextResponse.json({ error: "Identifiant invalide.", code: "invalid" }, { status: 400 });

export async function GET(_request: Request, context: Context) {
  const access = await requireSupervisionAccount();
  if (!access.ok) return access.response;
  const id = await parseId(context);
  if (!id) return BAD_ID();
  try {
    const supervision = await getSupervision(access.account.id, id);
    if (!supervision) return NextResponse.json({ error: "Veille introuvable.", code: "not_found" }, { status: 404 });
    return NextResponse.json({ supervision });
  } catch (error) {
    return supervisionFailure(error);
  }
}

// Modifie les critères (corps complet d'une veille) ou le statut ({ "status": "active" | "paused" | "archived" }).
export async function PATCH(request: Request, context: Context) {
  const access = await requireSupervisionAccount();
  if (!access.ok) return access.response;
  const id = await parseId(context);
  if (!id) return BAD_ID();
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  try {
    if (body && typeof body.status === "string") {
      if (!(STATUSES as readonly string[]).includes(body.status) || body.status === "draft") {
        return NextResponse.json({ error: "Statut inconnu.", code: "invalid" }, { status: 400 });
      }
      return NextResponse.json({ supervision: await setSupervisionStatus(access.account.id, access.account.tier, id, body.status as Status) });
    }
    const checked = validateSupervisionInput(body);
    if (!checked.ok) return NextResponse.json({ error: checked.errors.join(" "), errors: checked.errors, code: "invalid" }, { status: 400 });
    return NextResponse.json({ supervision: await updateSupervision(access.account.id, id, checked.value) });
  } catch (error) {
    return supervisionFailure(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  const access = await requireSupervisionAccount();
  if (!access.ok) return access.response;
  const id = await parseId(context);
  if (!id) return BAD_ID();
  try {
    if (!(await deleteSupervision(access.account.id, id))) {
      return NextResponse.json({ error: "Veille introuvable.", code: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return supervisionFailure(error);
  }
}
