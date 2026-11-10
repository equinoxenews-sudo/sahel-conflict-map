import { validateDecision } from "@/lib/supervision/alerts/rules";
import { listAlertStates, setAlertStates } from "@/lib/supervision/alerts/store";
import { failure, isUuid, json, readJson, storeProblem, supervisionOwner } from "@/lib/supervision/core/http";
import { getSupervision } from "@/lib/supervision/core/store";

// Décisions de l'utilisateur sur les alertes d'UNE Supervision du compte connecté (sans IA, aucun coût).
//  - GET : les décisions enregistrées (lue, conservée, masquée). Une alerte sans décision est « à traiter ».
//  - PUT : { status: 'read'|'kept'|'hidden'|'new', items: [{ eventRef, level }] } applique la décision à une ou plusieurs alertes
//    (100 au plus) ; 'new' rétablit l'alerte. Les alertes elles-mêmes se déduisent des événements du tableau : rien d'autre n'est stocké.

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await supervisionOwner();
  if (!owner.ok) return owner.response;
  const { id } = await params;
  if (!isUuid(id)) return failure("not_found");
  try {
    const states = await listAlertStates(owner.ownerId, id);
    if (!states) return failure("not_found");
    const supervision = await getSupervision(owner.ownerId, id);
    return json({ states, readOnly: supervision?.state === "read_only_grace" || supervision?.state === "pending_deletion" });
  } catch (error) {
    return storeProblem(error);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await supervisionOwner();
  if (!owner.ok) return owner.response;
  const { id } = await params;
  if (!isUuid(id)) return failure("not_found");
  const body = await readJson(request, 20_000);
  if (!body.ok) return failure(body.code);
  const input = validateDecision(body.value);
  if (!input.ok) return json({ error: "invalid_input", code: "invalid_input", errors: input.errors }, { status: 400 });
  try {
    const result = await setAlertStates(owner.ownerId, id, input.value.status, input.value.items);
    if (!result.ok) return failure(result.code, result.detail);
    return json({ applied: result.applied });
  } catch (error) {
    return storeProblem(error);
  }
}
