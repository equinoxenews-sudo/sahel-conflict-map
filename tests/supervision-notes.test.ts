import assert from "node:assert/strict";
import test from "node:test";
import { EVENT_TITLE_MAX, NOTE_MAX, cleanBody, noteMessage, toNote, validateNewNote, validateNoteUpdate } from "../lib/supervision/core/notes";

test("une note vide ou faite d'espaces est refusée, avec une phrase claire", () => {
  for (const body of ["", "   ", "\n\t\n", undefined, 12]) {
    const result = validateNewNote({ body });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.errors.join(" "), /vide/);
  }
  assert.equal(validateNewNote(null).ok, false);
});

test("le texte est nettoyé : fins de ligne normalisées, caractères de contrôle retirés, retours à la ligne conservés", () => {
  assert.equal(cleanBody("  ligne 1\r\nligne 2\rligne 3  "), "ligne 1\nligne 2\nligne 3");
  assert.equal(cleanBody("a\u0000b\u0007c\u007Fd"), "abcd");
  assert.equal(cleanBody("colonne\tdeux"), "colonne\tdeux");
  assert.equal(cleanBody(null), "");
});

test("longueur : 4000 caractères passent, 4001 sont refusés avec le nombre", () => {
  assert.equal(validateNewNote({ body: "x".repeat(NOTE_MAX) }).ok, true);
  const tooLong = validateNewNote({ body: "x".repeat(NOTE_MAX + 1) });
  assert.equal(tooLong.ok, false);
  if (!tooLong.ok) assert.match(tooLong.errors[0], /4001 caractères, 4000 au maximum/);
});

test("référence de publication : article, signalement et publication collectée passent ; une valeur libre est refusée", () => {
  for (const eventRef of ["a-123", "e-456", "p-3b263968-ff42-4edc-9f20-4ca424f5e50b"]) {
    const result = validateNewNote({ body: "ok", eventRef, eventTitle: "Titre" });
    assert.ok(result.ok, eventRef);
    if (result.ok) assert.equal(result.value.eventRef, eventRef);
  }
  for (const eventRef of ["", "123", "A-1", "a-", "a-<script>", "a-" + "x".repeat(81), 42]) {
    assert.equal(validateNewNote({ body: "ok", eventRef }).ok, false, String(eventRef));
  }
  const general = validateNewNote({ body: "ok", eventRef: null });
  assert.ok(general.ok);
  if (general.ok) assert.equal(general.value.eventRef, null);
});

test("le titre n'est qu'un repère : espaces réduits, coupé à 300, ignoré sans référence, jamais un motif de refus", () => {
  const long = validateNewNote({ body: "ok", eventRef: "a-1", eventTitle: `  Titre   avec\n espaces ${"y".repeat(400)}` });
  assert.ok(long.ok);
  if (long.ok) {
    assert.equal(long.value.eventTitle?.length, EVENT_TITLE_MAX);
    assert.match(long.value.eventTitle ?? "", /^Titre avec espaces y/);
  }
  const orphan = validateNewNote({ body: "ok", eventTitle: "Titre sans référence" });
  assert.ok(orphan.ok);
  if (orphan.ok) assert.equal(orphan.value.eventTitle, null);
  const blank = validateNewNote({ body: "ok", eventRef: "a-1", eventTitle: "   " });
  assert.ok(blank.ok);
  if (blank.ok) assert.equal(blank.value.eventTitle, null);
});

test("modification : la révision doit être un entier positif et le texte non vide", () => {
  assert.deepEqual(validateNoteUpdate({ body: " nouveau ", revision: 3 }), { ok: true, value: { body: "nouveau", revision: 3 } });
  for (const revision of [0, -1, 1.5, "2", null, undefined]) assert.equal(validateNoteUpdate({ body: "ok", revision }).ok, false, String(revision));
  const empty = validateNoteUpdate({ body: " ", revision: 1 });
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.match(empty.errors.join(" "), /vide/);
  const both = validateNoteUpdate({ body: "", revision: "x" });
  assert.equal(both.ok, false);
  if (!both.ok) assert.equal(both.errors.length, 2);
});

test("toNote lit une ligne SQL en snake_case, sans rien inventer", () => {
  const note = toNote({ id: "n1", event_ref: "p-abc", event_title: "Titre", body: "Texte", revision: 2, created_at: "2026-11-10T10:00:00Z", updated_at: "2026-11-10T11:00:00Z" });
  assert.deepEqual(note, { id: "n1", eventRef: "p-abc", eventTitle: "Titre", body: "Texte", revision: 2, createdAt: "2026-11-10T10:00:00Z", updatedAt: "2026-11-10T11:00:00Z" });
  const general = toNote({ id: "n2", event_ref: null, event_title: null, body: "Générale", created_at: "2026-11-10T10:00:00Z", updated_at: "2026-11-10T10:00:00Z" });
  assert.equal(general.eventRef, null);
  assert.equal(general.revision, 1);
});

test("messages : chaque code connu a sa phrase, un code inconnu ne montre jamais un code brut", () => {
  assert.match(noteMessage("limit_reached", { limit: 500 }), /500 notes/);
  assert.match(noteMessage("limit_reached"), /500 notes/);
  for (const code of ["read_only", "revision_conflict", "idempotency_conflict", "not_found", "invalid_input", "locked", "forbidden"]) {
    const message = noteMessage(code);
    assert.ok(message.length > 10 && !message.includes(code), code);
  }
  assert.match(noteMessage("revision_conflict"), /rien n'a été écrasé/);
  assert.equal(noteMessage("inattendu"), "L'opération a échoué. Réessaie dans un instant.");
  assert.equal(noteMessage(undefined), "L'opération a échoué. Réessaie dans un instant.");
});
