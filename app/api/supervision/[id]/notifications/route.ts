import { failure, isUuid, json, readJson, storeProblem, supervisionOwner } from "@/lib/supervision/core/http";
import { getSupervision } from "@/lib/supervision/core/store";
import { defaultDeps, requestConfirmation, requestTest } from "@/lib/supervision/notify/run";
import { notifyMessage, validateRules } from "@/lib/supervision/notify/rules";
import { getRules, listJournal, setRules } from "@/lib/supervision/notify/store";

// Notifications par e-mail d'UNE Supervision du compte connecté (sans IA, aucun coût d'IA).
//  - GET : préférences, journal d'envoi (12 derniers messages) et mode d'envoi (« sans envoi » ou réel, avec la raison).
//  - PUT : { enabled, immediateLevels, digest, recipient } enregistre les préférences. Changer d'adresse annule sa confirmation.
//  - POST : { action: 'confirm' } envoie le lien de confirmation de l'adresse ; { action: 'test' } envoie un e-mail de test à l'adresse
//    confirmée. Chacun est limité dans le temps (une demande toutes les 10 minutes, ou 2 minutes pour le test).
// Aucun message n'est jamais envoyé à une adresse non confirmée, et rien ne part d'une Supervision qui n'est pas active.
export const maxDuration = 60;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await supervisionOwner();
  if (!owner.ok) return owner.response;
  const { id } = await params;
  if (!isUuid(id)) return failure("not_found");
  try {
    const rules = await getRules(owner.ownerId, id);
    const journal = await listJournal(owner.ownerId, id);
    if (!rules || !journal) return failure("not_found");
    const supervision = await getSupervision(owner.ownerId, id);
    const { mode, reason } = defaultDeps();
    return json({ rules, journal, mode, reason, readOnly: supervision?.state === "read_only_grace" || supervision?.state === "pending_deletion", state: supervision?.state ?? null });
  } catch (error) {
    return storeProblem(error);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await supervisionOwner();
  if (!owner.ok) return owner.response;
  const { id } = await params;
  if (!isUuid(id)) return failure("not_found");
  const body = await readJson(request, 4_000);
  if (!body.ok) return failure(body.code);
  const input = validateRules(body.value);
  if (!input.ok) return json({ error: "invalid_input", code: "invalid_input", errors: input.errors }, { status: 400 });
  try {
    const result = await setRules(owner.ownerId, id, input.value);
    if (!result.ok) return failure(result.code, result.detail);
    return json({ rules: result.rules });
  } catch (error) {
    return storeProblem(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await supervisionOwner();
  if (!owner.ok) return owner.response;
  const { id } = await params;
  if (!isUuid(id)) return failure("not_found");
  const body = await readJson(request, 1_000);
  if (!body.ok) return failure(body.code);
  const action = typeof body.value === "object" && body.value !== null ? (body.value as Record<string, unknown>).action : undefined;
  if (action !== "confirm" && action !== "test") return json({ error: "invalid_input", code: "invalid_input", message: notifyMessage("invalid_input") }, { status: 400 });
  try {
    const deps = defaultDeps();
    if (action === "confirm" && !deps.secret) return json({ error: "not_configured", code: "not_configured", message: "La signature des liens n'est pas configurée sur ce serveur." }, { status: 503 });
    const result = action === "confirm" ? await requestConfirmation(owner.ownerId, id, deps) : await requestTest(owner.ownerId, id, deps);
    if (!result.ok) return failure(result.code, result.retryAfterSeconds !== undefined ? { retry_after_seconds: result.retryAfterSeconds } : {});
    return json({ requested: action, mode: deps.mode, reason: deps.reason });
  } catch (error) {
    return storeProblem(error);
  }
}
