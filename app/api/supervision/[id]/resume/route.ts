import { failure, isUuid, json, operationKey, readJson, storeProblem, supervisionOwner } from "@/lib/supervision/core/http";
import { getSupervision, resume } from "@/lib/supervision/core/store";

// Reprise d'UNE Supervision en pause, inchangée : aucun crédit, mais une place active doit être libre. La collecte reprend de façon
// prospective (aucune reconstitution massive de l'historique). Corps : { key?: identifiant d'opération (même clic = même clé) }.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await supervisionOwner();
  if (!owner.ok) return owner.response;
  const { id } = await params;
  if (!isUuid(id)) return failure("not_found");
  const body = await readJson(request, 2_000);
  const key = operationKey(body.ok && typeof body.value === "object" && body.value !== null ? (body.value as Record<string, unknown>).key : undefined, "resume");
  try {
    const result = await resume(owner.ownerId, id, key, await owner.access());
    if (!result.ok) return failure(result.code, result.detail);
    const supervision = await getSupervision(owner.ownerId, id);
    return json({ state: supervision?.state ?? "active", replay: result.replay });
  } catch (error) {
    return storeProblem(error);
  }
}
