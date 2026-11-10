import { randomUUID } from "node:crypto";
import { failure, isUuid, json, readJson, storeProblem, supervisionOwner } from "@/lib/supervision/core/http";
import { getPolicy } from "@/lib/supervision/core/policy";
import { OBJECTIVES } from "@/lib/supervision/core/scope";
import { COUNTRIES_MAX, TERMS_MAX, TERM_MAX, TERM_MIN, applyScopeEdit, editOf, isUnchanged, validateScopeEdit } from "@/lib/supervision/core/scopeEdit";
import { classifyProposal, getScopeSnapshot, getSupervision, proposeScopeChange } from "@/lib/supervision/core/store";

// Périmètre d'UNE Supervision du compte connecté : lecture (GET) et modification (PUT).
//  - Chaque modification crée une NOUVELLE version immuable (l'historique du périmètre est conservé) ; une modification qui ne change
//    rien n'en crée aucune.
//  - Brouillon : toute modification est libre. Supervision active ou en pause : le serveur classe d'abord le changement (mineur ou
//    majeur) ; un changement majeur demande une confirmation (crédit) qui n'existe pas encore : il est refusé avec la classification.
//  - Sans IA : rien ici n'appelle de modèle.
//  - Les publications DÉJÀ rattachées ne sont pas ré-évaluées par ce changement : il s'applique aux prochaines collectes.

const KEY = /^[A-Za-z0-9_-]{8,80}$/;

const LIMITS = { termMin: TERM_MIN, termMax: TERM_MAX, termsMax: TERMS_MAX, countriesMax: COUNTRIES_MAX };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await supervisionOwner();
  if (!owner.ok) return owner.response;
  const { id } = await params;
  if (!isUuid(id)) return failure("not_found");
  try {
    const supervision = await getSupervision(owner.ownerId, id);
    if (!supervision || !supervision.currentScopeVersionId) return failure("not_found");
    const snapshot = await getScopeSnapshot(owner.ownerId, id, supervision.currentScopeVersionId);
    if (!snapshot) return failure("not_found");
    return json({ scope: editOf(snapshot), state: supervision.state, pending: supervision.pendingScopeVersionId !== null, objectives: OBJECTIVES, limits: LIMITS });
  } catch (error) {
    return storeProblem(error);
  }
}

/** Corps : { edit: { countries, objective, keywords, entities, exclusions }, key?: identifiant d'opération, preview?: true }. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await supervisionOwner();
  if (!owner.ok) return owner.response;
  const { id } = await params;
  if (!isUuid(id)) return failure("not_found");
  const body = await readJson(request, 20_000);
  if (!body.ok) return failure(body.code);
  const payload = (typeof body.value === "object" && body.value !== null ? body.value : {}) as Record<string, unknown>;
  const edit = validateScopeEdit(payload.edit);
  if (!edit.ok) return json({ error: "invalid_input", code: "invalid_input", errors: edit.errors }, { status: 400 });
  const key = typeof payload.key === "string" && KEY.test(payload.key) ? payload.key : randomUUID();

  try {
    const supervision = await getSupervision(owner.ownerId, id);
    if (!supervision || !supervision.currentScopeVersionId) return failure("not_found");
    const current = await getScopeSnapshot(owner.ownerId, id, supervision.currentScopeVersionId);
    if (!current) return failure("not_found");

    if (isUnchanged(current, edit.value)) return json({ changed: false, scope: editOf(current), state: supervision.state });

    const next = applyScopeEdit(current, edit.value);
    const proposal = await classifyProposal(owner.ownerId, id, next, getPolicy());
    if (!proposal) return failure("not_found");
    const { classification } = proposal;
    const locked = (supervision.state === "active" || supervision.state === "paused") && classification.major;

    if (payload.preview === true) return json({ changed: true, preview: true, classification, applicable: !locked, state: supervision.state });
    if (locked) return failure("major_change_needs_confirmation", { classification });

    const result = await proposeScopeChange(owner.ownerId, id, key, next, await owner.access(), undefined, getPolicy());
    if ("classification" in result) {
      if (!result.outcome.ok) return failure(result.outcome.code, { ...result.outcome.detail, classification: result.classification });
      return json({ changed: true, scopeVersionId: result.outcome.scope_version_id, major: result.outcome.major, classification: result.classification, scope: editOf(next), state: supervision.state });
    }
    if (!result.ok) return failure(result.code, result.detail);
    return json({ changed: true, scope: editOf(next), state: supervision.state });
  } catch (error) {
    return storeProblem(error);
  }
}
