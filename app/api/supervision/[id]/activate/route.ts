import { activateSupervision } from "@/lib/supervision/core/activation";
import { failure, isUuid, json, operationKey, readJson, storeProblem, supervisionOwner } from "@/lib/supervision/core/http";
import { getSupervision } from "@/lib/supervision/core/store";

// Activation d'UNE Supervision du compte connecté : réserve les droits, lance une première collecte de presse (sans IA), puis confirme.
// Échec de la première collecte : retour en brouillon, rien n'est consommé. Corps : { key?: identifiant d'opération (même clic = même clé) }.
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await supervisionOwner();
  if (!owner.ok) return owner.response;
  const { id } = await params;
  if (!isUuid(id)) return failure("not_found");
  const body = await readJson(request, 2_000);
  const key = operationKey(body.ok && typeof body.value === "object" && body.value !== null ? (body.value as Record<string, unknown>).key : undefined, "activate");
  try {
    const result = await activateSupervision(owner.ownerId, id, key, await owner.access());
    if (!result.ok) return failure(result.code, result.detail);
    const supervision = await getSupervision(owner.ownerId, id);
    return json({ state: supervision?.state ?? result.state, replay: result.replay, collection: result.collection });
  } catch (error) {
    return storeProblem(error);
  }
}
