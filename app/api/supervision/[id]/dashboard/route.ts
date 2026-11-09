import { MAX_DASHBOARD_BYTES, getDashboardRevision, listDashboardRevisions, saveDashboard } from "@/lib/supervision/core/dashboards";
import { failure, isUuid, json, readJson, storeProblem, supervisionOwner } from "@/lib/supervision/core/http";

// Enregistrement du tableau de bord avec CONTRÔLE DE RÉVISION : le corps porte la révision que le navigateur avait lue ; si le serveur
// en a une plus récente (autre onglet, autre appareil), rien n'est écrasé et la réponse 409 contient la version du serveur.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await supervisionOwner();
  if (!owner.ok) return owner.response;
  const { id } = await params;
  if (!isUuid(id)) return failure("not_found");
  const body = await readJson(request, MAX_DASHBOARD_BYTES + 2_000);
  if (!body.ok) return failure(body.code);
  const { expectedRevision, state } = (typeof body.value === "object" && body.value !== null ? body.value : {}) as { expectedRevision?: unknown; state?: unknown };
  if (typeof expectedRevision !== "number") return failure("invalid_state_document");
  try {
    const result = await saveDashboard(owner.ownerId, id, expectedRevision, state);
    if (!result.ok) {
      if (result.code === "revision_conflict") {
        const detail = result.detail as { current_revision?: number; current_state?: unknown; saved_at?: string };
        return failure("revision_conflict", { currentRevision: detail.current_revision, currentState: detail.current_state ?? null, savedAt: detail.saved_at ?? null });
      }
      return failure(result.code, result.detail);
    }
    return json({ revision: result.revision, savedAt: result.saved_at });
  } catch (error) {
    return storeProblem(error);
  }
}

// Historique : sans paramètre, la liste des dernières révisions ; avec ?revision=N, le contenu de cette révision (pour la restaurer).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await supervisionOwner();
  if (!owner.ok) return owner.response;
  const { id } = await params;
  if (!isUuid(id)) return failure("not_found");
  const wanted = new URL(request.url).searchParams.get("revision");
  try {
    if (wanted !== null) {
      const revision = Number(wanted);
      if (!Number.isInteger(revision) || revision < 1) return failure("not_found");
      const state = await getDashboardRevision(owner.ownerId, id, revision);
      return state ? json({ revision, state }) : failure("not_found");
    }
    return json({ revisions: await listDashboardRevisions(owner.ownerId, id) });
  } catch (error) {
    return storeProblem(error);
  }
}
