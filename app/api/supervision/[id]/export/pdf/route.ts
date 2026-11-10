import { failure, isUuid, json, storeProblem, supervisionOwner } from "@/lib/supervision/core/http";
import { DataError } from "@/lib/supervision/data/board";
import { EXPORT_PERIODS, isExportPeriod } from "@/lib/supervision/export/report";
import { generateSupervisionReport } from "@/lib/supervision/export/generate";

// Rapport PDF d'UNE Supervision du compte connecté (sans IA, aucun coût). GET ?days=7|30|90 (30 par défaut) &notes=1 pour inclure les
// notes personnelles. Refusé hors des états qui permettent l'export (brouillon, suppression) ; pour tout autre compte : 404.
export const maxDuration = 60;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await supervisionOwner();
  if (!owner.ok) return owner.response;
  const { id } = await params;
  if (!isUuid(id)) return failure("not_found");
  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days") ?? 30);
  if (!isExportPeriod(days)) return json({ error: "invalid_input", code: "invalid_input", message: `Période invalide : ${EXPORT_PERIODS.join(", ")} jours.` }, { status: 400 });
  try {
    const result = await generateSupervisionReport(owner.ownerId, id, { period: days, includeNotes: url.searchParams.get("notes") === "1" });
    if (!result.ok) return result.code === "not_found" ? failure("not_found") : json({ error: "export_unavailable", code: "export_unavailable", state: result.state }, { status: 409 });
    const filename = result.filename;
    // Copie dans un ArrayBuffer neuf : le corps d'une réponse web ne prend pas un Uint8Array adossé à un tampon partagé.
    const body = new Uint8Array(result.bytes).buffer;
    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Length": String(result.bytes.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof DataError) return json({ error: "Les données de la Supervision sont momentanément indisponibles.", code: "data_unavailable" }, { status: 503 });
    return storeProblem(error);
  }
}
