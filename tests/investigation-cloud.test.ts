import assert from "node:assert/strict";
import test from "node:test";
import { splitIntoChunks } from "../lib/investigation/cloudSync";

test("Un petit dossier tient en un seul morceau", () => {
  assert.deepEqual(splitIntoChunks("abc", 10), ["abc"]);
  assert.deepEqual(splitIntoChunks("", 10), [""]);
});

test("Un gros dossier est découpé puis se recompose à l'identique", () => {
  const text = "x".repeat(25) + "é€😀".repeat(7);
  const chunks = splitIntoChunks(text, 10);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 10));
  assert.equal(chunks.join(""), text);
});
