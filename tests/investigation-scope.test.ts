import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getStorageScope, isValidScope, scopedKey, scopedName, setStorageScope } from "../lib/investigation/scope";
import { SYNC_BASES_BASE_KEY } from "../lib/investigation/autoSave";
import { STORAGE_BASE_KEY } from "../lib/investigation/storage";

// Les noms d'origine, ceux sous lesquels sont enregistrés les dossiers de Nicolas dans son navigateur. Cette liste est
// FIGÉE : si un de ces tests casse, des dossiers existants deviendraient illisibles.
const LEGACY = {
  dossiers: "equinoxe-investigation-v1",
  synchro: "equinoxe-investigation-sync-v1",
  images: "equinoxe-investigation-images",
  files: "equinoxe-investigation-files",
  backups: "equinoxe-investigation-backups",
};

test("tant que la portée n'est pas posée, rien n'est lisible (échec fermé, pas de repli sur le fondateur)", () => {
  assert.equal(getStorageScope(), null);
  assert.throws(() => scopedKey(LEGACY.dossiers), /non définie/);
});

test("les noms d'origine sont figés dans le code", () => {
  assert.equal(STORAGE_BASE_KEY, LEGACY.dossiers);
  assert.equal(SYNC_BASES_BASE_KEY, LEGACY.synchro);
  for (const [file, name] of [
    ["imageStore", LEGACY.images],
    ["fileStore", LEGACY.files],
    ["backups", LEGACY.backups],
  ]) {
    assert.ok(readFileSync(`lib/investigation/${file}.ts`, "utf8").includes(`"${name}"`), `${file} : nom de base d'origine modifié`);
  }
});

test("portée du fondateur (vide) : les noms d'origine, strictement inchangés", () => {
  for (const name of Object.values(LEGACY)) assert.equal(scopedName(name, ""), name);
  setStorageScope("");
  assert.equal(scopedKey(LEGACY.dossiers), "equinoxe-investigation-v1");
  assert.equal(scopedKey(LEGACY.images), "equinoxe-investigation-images");
});

test("compte individuel : chaque nom reçoit le suffixe du compte et ne retombe jamais sur un nom d'origine", () => {
  for (const name of Object.values(LEGACY)) {
    const scoped = scopedName(name, "marc");
    assert.equal(scoped, `${name}:marc`);
    assert.ok(!Object.values(LEGACY).includes(scoped));
    assert.notEqual(scopedName(name, "marc"), scopedName(name, "paul"));
  }
});

test("deux comptes n'ont jamais le même nom, même avec des identifiants qui se ressemblent", () => {
  const names = new Set(["", "marc", "marc.2", "marc-2", "marc_2", "marcc"].map((scope) => scopedName(LEGACY.dossiers, scope)));
  assert.equal(names.size, 6);
});

test("une portée mal formée est refusée (pas de séparateur ni de casse ambiguë)", () => {
  for (const scope of ["Marc", "ma rc", "marc:evil", "ab", "a/b", "marc;", "../x", "x".repeat(41)]) {
    assert.equal(isValidScope(scope), false, scope);
    assert.throws(() => scopedName(LEGACY.dossiers, scope));
    assert.throws(() => setStorageScope(scope));
  }
  assert.equal(isValidScope(""), true);
  assert.equal(isValidScope("marc"), true);
  assert.equal(isValidScope(undefined), false);
});
