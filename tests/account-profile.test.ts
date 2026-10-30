process.env.EQUINOXE_FAKE_DB = "1";

import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { getCode, getOrCreateCode, regenerateCode } from "../lib/accountCodes";
import { CODE_ALPHABET, CODE_LENGTH, formatCode, generateCode, normalizeCode, tierLabel } from "../lib/accountProfile";
import { resetFakeDb } from "../lib/testing/fakeSupabase";

beforeEach(() => resetFakeDb());

test("l'accès affiché : « Superadmin » pour le fondateur, l'offre pour les autres", () => {
  assert.equal(tierLabel("owner"), "Superadmin");
  assert.equal(tierLabel("plus"), "Plus");
  assert.equal(tierLabel("pro"), "Pro");
  assert.equal(tierLabel("intelligence"), "Intelligence");
  assert.equal(tierLabel("enterprise"), "Entreprise");
});

test("un IDcode a 8 caractères, sans caractère ambigu, et s'affiche avec un #", () => {
  for (let i = 0; i < 200; i++) {
    const code = generateCode();
    assert.equal(code.length, CODE_LENGTH);
    assert.ok([...code].every((char) => CODE_ALPHABET.includes(char)), code);
    assert.ok(!/[01OIL]/.test(code), code);
  }
  assert.equal(formatCode("78DG4HB5"), "#78DG4HB5");
});

test("les IDcode générés ne se répètent pas", () => {
  assert.equal(new Set(Array.from({ length: 500 }, () => generateCode())).size, 500);
});

test("un IDcode tapé à la main se reconnaît avec ou sans #, en minuscules, avec des espaces", () => {
  assert.equal(normalizeCode("#78DG4HB5"), "78DG4HB5");
  assert.equal(normalizeCode("78dg4hb5"), "78DG4HB5");
  assert.equal(normalizeCode(" #78dg-4hb5 "), "78DG4HB5");
  assert.equal(normalizeCode("78DG4HB"), null);
  assert.equal(normalizeCode("78DG4HB50"), null);
  assert.equal(normalizeCode("78DG4HB0"), null, "0 n'existe pas dans l'alphabet");
  assert.equal(normalizeCode(undefined), null);
  assert.equal(normalizeCode(12345678), null);
});

test("le code est créé à la première demande puis reste le même", async () => {
  assert.equal(await getCode("test-alice"), null);
  const first = await getOrCreateCode("test-alice");
  assert.equal(await getOrCreateCode("test-alice"), first);
  assert.equal(await getCode("test-alice"), first);
});

test("chaque compte, le fondateur compris, a son propre code", async () => {
  const codes = await Promise.all(["nicof", "test-alice", "test-bruno"].map((id) => getOrCreateCode(id)));
  assert.equal(new Set(codes).size, 3);
});

test("renouveler remplace le code : l'ancien n'existe plus", async () => {
  const before = await getOrCreateCode("test-alice");
  const after = await regenerateCode("test-alice");
  assert.notEqual(after, before);
  assert.equal(await getCode("test-alice"), after);
});
