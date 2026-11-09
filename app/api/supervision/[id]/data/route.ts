import { failure, isUuid, json, storeProblem, supervisionOwner } from "@/lib/supervision/core/http";
import { getScopeSnapshot, getSupervision } from "@/lib/supervision/core/store";
import { DataError, loadBoardData } from "@/lib/supervision/data/board";

// Les événements réels du périmètre d'UNE Supervision du compte connecté (90 derniers jours ; les filtres de période et de thème
// s'appliquent ensuite dans le navigateur). Pour tout autre compte : 404. Lecture seule, aucun appel IA.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await supervisionOwner();
  if (!owner.ok) return owner.response;
  const { id } = await params;
  if (!isUuid(id)) return failure("not_found");
  try {
    const supervision = await getSupervision(owner.ownerId, id);
    if (!supervision) return failure("not_found");
    const snapshot = supervision.currentScopeVersionId ? await getScopeSnapshot(owner.ownerId, id, supervision.currentScopeVersionId) : null;
    if (!snapshot) return failure("not_found");
    return json(await loadBoardData(snapshot));
  } catch (error) {
    if (error instanceof DataError) return json({ error: "Les données de la Supervision sont momentanément indisponibles.", code: "data_unavailable" }, { status: 503 });
    return storeProblem(error);
  }
}
