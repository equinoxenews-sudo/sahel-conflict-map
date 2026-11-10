import { failure, isUuid, json, operationKey, readJson, storeProblem, supervisionOwner } from "@/lib/supervision/core/http";
import { EVENT_REF, NOTE_MAX, NOTES_MAX, noteMessage, validateNewNote } from "@/lib/supervision/core/notes";
import { addNote, listNotes } from "@/lib/supervision/core/notesStore";
import { getSupervision } from "@/lib/supervision/core/store";

// Notes d'UNE Supervision du compte connecté (sans IA, aucun coût).
//  - GET : les notes non supprimées, les plus récentes d'abord ; ?event=<référence> ne garde que celles d'une publication.
//  - POST : { body, eventRef?, eventTitle?, key? } ajoute une note. La clé (même saisie = même clé) rend l'ajout idempotent :
//    un double clic ne crée qu'une note.

const LIMITS = { noteMax: NOTE_MAX, notesMax: NOTES_MAX };

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await supervisionOwner();
  if (!owner.ok) return owner.response;
  const { id } = await params;
  if (!isUuid(id)) return failure("not_found");
  const event = new URL(request.url).searchParams.get("event");
  if (event !== null && !EVENT_REF.test(event)) return json({ error: "invalid_input", code: "invalid_input", message: noteMessage("invalid_input") }, { status: 400 });
  try {
    const notes = await listNotes(owner.ownerId, id, { eventRef: event });
    if (!notes) return failure("not_found");
    const supervision = await getSupervision(owner.ownerId, id);
    const readOnly = supervision?.state === "read_only_grace" || supervision?.state === "pending_deletion";
    return json({ notes, readOnly, limits: LIMITS });
  } catch (error) {
    return storeProblem(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await supervisionOwner();
  if (!owner.ok) return owner.response;
  const { id } = await params;
  if (!isUuid(id)) return failure("not_found");
  const body = await readJson(request, 12_000);
  if (!body.ok) return failure(body.code);
  const payload = typeof body.value === "object" && body.value !== null ? (body.value as Record<string, unknown>) : {};
  const input = validateNewNote(payload);
  if (!input.ok) return json({ error: "invalid_input", code: "invalid_input", errors: input.errors }, { status: 400 });
  const key = operationKey(payload.key, "note");
  try {
    const result = await addNote(owner.ownerId, id, key, input.value);
    if (!result.ok) return failure(result.code, result.detail);
    return json({ note: result.note, replay: result.replay }, { status: result.replay ? 200 : 201 });
  } catch (error) {
    return storeProblem(error);
  }
}
