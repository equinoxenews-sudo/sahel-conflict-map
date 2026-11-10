import { getDashboard } from "@/lib/supervision/core/dashboards";
import { failure, isUuid, json, storeProblem, supervisionOwner } from "@/lib/supervision/core/http";
import { deleteDraft, getSupervision } from "@/lib/supervision/core/store";

// Une Supervision DU COMPTE CONNECTÉ avec son tableau de bord. Pour tout autre compte : 404 (on ne révèle même pas qu'elle existe).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await supervisionOwner();
  if (!owner.ok) return owner.response;
  const { id } = await params;
  if (!isUuid(id)) return failure("not_found");
  try {
    const supervision = await getSupervision(owner.ownerId, id);
    if (!supervision) return failure("not_found");
    const dashboard = await getDashboard(owner.ownerId, id);
    return json({ supervision, dashboard });
  } catch (error) {
    return storeProblem(error);
  }
}

// Suppression d'un BROUILLON du compte connecté (jamais une Supervision active, en pause ou en lecture seule). Le brouillon sort de la
// liste et libère une place de brouillon ; ses données ne sont pas effacées de la base.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await supervisionOwner();
  if (!owner.ok) return owner.response;
  const { id } = await params;
  if (!isUuid(id)) return failure("not_found");
  try {
    const result = await deleteDraft(owner.ownerId, id);
    if (!result.ok) return failure(result.code, result.detail);
    return json({ state: "deleted" });
  } catch (error) {
    return storeProblem(error);
  }
}
