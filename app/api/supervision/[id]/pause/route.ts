import { failure, isUuid, json, operationKey, readJson, storeProblem, supervisionOwner } from "@/lib/supervision/core/http";
import { getSupervision, pause } from "@/lib/supervision/core/store";

// Pause d'UNE Supervision active : arrête collecte, IA et notifications, libère une place active, ne coûte aucun crédit. Les données et
// le tableau restent consultables. Corps : { key?: identifiant d'opération (même clic = même clé) }.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await supervisionOwner();
  if (!owner.ok) return owner.response;
  const { id } = await params;
  if (!isUuid(id)) return failure("not_found");
  const body = await readJson(request, 2_000);
  const key = operationKey(body.ok && typeof body.value === "object" && body.value !== null ? (body.value as Record<string, unknown>).key : undefined, "pause");
  try {
    const result = await pause(owner.ownerId, id, key, await owner.access());
    if (!result.ok) return failure(result.code, result.detail);
    const supervision = await getSupervision(owner.ownerId, id);
    return json({ state: supervision?.state ?? "paused", replay: result.replay });
  } catch (error) {
    return storeProblem(error);
  }
}
