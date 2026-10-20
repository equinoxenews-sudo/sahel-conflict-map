import assert from "node:assert/strict";
import test from "node:test";
import { moveNote, sortNotes } from "../lib/investigation/noteOrder";

const note = (id: string, title: string, sortOrder?: number) => ({ id, title, sortOrder });

test("sans ordre choisi : ordre alphabétique", () => {
  const sorted = sortNotes([note("c", "Charlie"), note("a", "Alpha"), note("b", "Bravo")]);
  assert.deepEqual(sorted.map((n) => n.id), ["a", "b", "c"]);
});

test("l'ordre choisi passe avant l'alphabétique, et les nouvelles notes se rangent à la fin", () => {
  const sorted = sortNotes([note("a", "Alpha"), note("b", "Bravo", 10), note("c", "Charlie", 20), note("z", "Zoé")]);
  assert.deepEqual(sorted.map((n) => n.id), ["b", "c", "a", "z"]);
});

test("monter une note échange sa place avec la précédente et fige toute la liste", () => {
  const list = sortNotes([note("a", "Alpha"), note("b", "Bravo"), note("c", "Charlie")]);
  const orders = moveNote(list, "c", -1);
  const reordered = sortNotes(list.map((n) => ({ ...n, sortOrder: orders[n.id] })));
  assert.deepEqual({ ...orders }, { a: 10, c: 20, b: 30 });
  assert.deepEqual(reordered.map((n) => n.id), ["a", "c", "b"]);
});

test("descendre une note", () => {
  const list = sortNotes([note("a", "Alpha"), note("b", "Bravo"), note("c", "Charlie")]);
  assert.deepEqual(moveNote(list, "a", 1), { b: 10, a: 20, c: 30 });
});

test("première note vers le haut, dernière vers le bas, note inconnue : rien ne bouge", () => {
  const list = [note("a", "Alpha"), note("b", "Bravo")];
  assert.deepEqual(moveNote(list, "a", -1), {});
  assert.deepEqual(moveNote(list, "b", 1), {});
  assert.deepEqual(moveNote(list, "zzz", 1), {});
});
