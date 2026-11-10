import { failure, isUuid, json, readJson, storeProblem, supervisionOwner } from "@/lib/supervision/core/http";
import { validateNoteUpdate } from "@/lib/supervision/core/notes";
import { deleteNote, updateNote } from "@/lib/supervision/core/notesStore";

// Une note d'UNE Supervision du compte connecté.
//  - PATCH : { body, revision } modifie le texte ; la révision lue par le navigateur doit être la révision actuelle (sinon 409, rien n'est écrasé).
//  - DELETE : masque la note (jamais effacée) ; répéter la suppression est sans effet.

type Context = { params: Promise<{ id: string; noteId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const owner = await supervisionOwner();
  if (!owner.ok) return owner.response;
  const { id, noteId } = await params;
  if (!isUuid(id) || !isUuid(noteId)) return failure("not_found");
  const body = await readJson(request, 12_000);
  if (!body.ok) return failure(body.code);
  const input = validateNoteUpdate(body.value);
  if (!input.ok) return json({ error: "invalid_input", code: "invalid_input", errors: input.errors }, { status: 400 });
  try {
    const result = await updateNote(owner.ownerId, id, noteId, input.value.body, input.value.revision);
    if (!result.ok) return failure(result.code, result.detail);
    return json({ note: result.note });
  } catch (error) {
    return storeProblem(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const owner = await supervisionOwner();
  if (!owner.ok) return owner.response;
  const { id, noteId } = await params;
  if (!isUuid(id) || !isUuid(noteId)) return failure("not_found");
  try {
    const result = await deleteNote(owner.ownerId, id, noteId);
    if (!result.ok) return failure(result.code, result.detail);
    return json({ deleted: true, replay: result.replay });
  } catch (error) {
    return storeProblem(error);
  }
}
