import { createDraft, listSupervisions } from "@/lib/supervision/core/store";
import { failure, json, readJson, storeProblem, supervisionOwner } from "@/lib/supervision/core/http";
import { getPolicy } from "@/lib/supervision/core/policy";
import { initialScope, validateCreateInput } from "@/lib/supervision/core/scope";

// Liste et création (en brouillon) des Supervisions DU COMPTE CONNECTÉ. Un brouillon ne consomme aucun crédit.
export async function GET() {
  const owner = await supervisionOwner();
  if (!owner.ok) return owner.response;
  try {
    const [supervisions, access] = await Promise.all([listSupervisions(owner.ownerId), owner.access()]);
    return json({ supervisions, access: { plan: access.plan, mode: access.mode, activeLimit: access.activeLimit, pausedLimit: access.pausedLimit, creditLimit: access.creditLimit } });
  } catch (error) {
    return storeProblem(error);
  }
}

export async function POST(request: Request) {
  const owner = await supervisionOwner();
  if (!owner.ok) return owner.response;
  const body = await readJson(request, 10_000);
  if (!body.ok) return failure(body.code);
  const input = validateCreateInput(body.value);
  if (!input.ok) return json({ error: "invalid_input", code: "invalid_input", errors: input.errors }, { status: 400 });
  try {
    const result = await createDraft(owner.ownerId, input.value.name, initialScope(input.value), getPolicy());
    if (!result.ok) return failure(result.code, result.detail);
    return json({ id: result.supervision_id }, { status: 201 });
  } catch (error) {
    return storeProblem(error);
  }
}
