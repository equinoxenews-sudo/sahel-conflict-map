import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { validateReportEdit } from "@/lib/situationReport";
import { deleteDraftAdmin, getReportAdmin, saveReportAdmin, setReportStatusAdmin } from "@/lib/situationReportAdmin";

type Context = { params: Promise<{ id: string }> };

function refreshPublicPages(zoneSlug: string, id: number) {
  revalidatePath(`/zones/${zoneSlug}/analyse`);
  revalidatePath(`/zones/${zoneSlug}/analyse/${id}`);
  revalidatePath(`/zones/${zoneSlug}`);
}

async function parseId(context: Context): Promise<number | null> {
  const id = Number((await context.params).id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const UNAUTHORIZED = () => NextResponse.json({ error: "Non autorisé." }, { status: 401 });

// Enregistre les corrections du relecteur (brouillon ou rapport déjà publié).
export async function PUT(request: Request, context: Context) {
  if (!(await isAdmin())) return UNAUTHORIZED();
  const id = await parseId(context);
  if (id === null) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });

  const edit = validateReportEdit(await request.json().catch(() => null));
  if (!edit) return NextResponse.json({ error: "Contenu invalide : titre, conclusion et événements sont obligatoires." }, { status: 400 });

  try {
    const report = await saveReportAdmin(id, edit);
    if (!report) return NextResponse.json({ error: "Rapport introuvable." }, { status: 404 });
    if (report.status === "published") refreshPublicPages(report.zone_slug, id);
    return NextResponse.json({ ok: true, report });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inconnue." }, { status: 500 });
  }
}

// { "action": "publish" | "unpublish" }
export async function POST(request: Request, context: Context) {
  if (!(await isAdmin())) return UNAUTHORIZED();
  const id = await parseId(context);
  if (id === null) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });

  const body = (await request.json().catch(() => null)) as { action?: unknown } | null;
  if (body?.action !== "publish" && body?.action !== "unpublish") {
    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }

  try {
    const report = await setReportStatusAdmin(id, body.action === "publish" ? "published" : "draft");
    if (!report) return NextResponse.json({ error: "Rapport introuvable." }, { status: 404 });
    refreshPublicPages(report.zone_slug, id);
    return NextResponse.json({ ok: true, report });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inconnue." }, { status: 500 });
  }
}

// Supprime un brouillon rejeté (jamais un rapport publié).
export async function DELETE(_request: Request, context: Context) {
  if (!(await isAdmin())) return UNAUTHORIZED();
  const id = await parseId(context);
  if (id === null) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });

  try {
    const existing = await getReportAdmin(id);
    if (!existing) return NextResponse.json({ error: "Rapport introuvable." }, { status: 404 });
    if (!(await deleteDraftAdmin(id))) {
      return NextResponse.json({ error: "Seul un brouillon peut être supprimé : repasse d'abord le rapport en brouillon." }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur inconnue." }, { status: 500 });
  }
}
