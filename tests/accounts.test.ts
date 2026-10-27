import assert from "node:assert/strict";
import test from "node:test";
import {
  hashPassword,
  isValidIdentifier,
  normalizeIdentifier,
  readSession,
  signSession,
  verifyPassword,
  type Account,
} from "../lib/accounts";

const ACCOUNT: Account = { id: "marc", name: "Marc", tier: "intelligence", timezone: "Europe/Paris" };
const SECRET = "secret-de-test";
const NOW = Date.parse("2026-11-01T10:00:00Z");

test("un mot de passe ne se retrouve pas dans son hachage, et chaque hachage a son sel", () => {
  const first = hashPassword("un-mot-de-passe-solide");
  const second = hashPassword("un-mot-de-passe-solide");
  assert.ok(!first.includes("un-mot-de-passe-solide"));
  assert.notEqual(first, second);
  assert.match(first, /^scrypt\$\d+\$\d+\$\d+\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
});

test("seul le bon mot de passe est accepté", () => {
  const stored = hashPassword("un-mot-de-passe-solide");
  assert.equal(verifyPassword("un-mot-de-passe-solide", stored), true);
  assert.equal(verifyPassword("un-mot-de-passe-solidE", stored), false);
  assert.equal(verifyPassword("", stored), false);
});

test("un hachage abîmé ou inconnu refuse toujours la connexion", () => {
  assert.equal(verifyPassword("x", ""), false);
  assert.equal(verifyPassword("x", "bcrypt$1$2$3$a$b"), false);
  assert.equal(verifyPassword("x", "scrypt$0$8$1$AAAA$AAAA"), false);
  assert.equal(verifyPassword("x", "scrypt$16384$8$1$AAAA$"), false);
});

test("les identifiants se normalisent et se contrôlent", () => {
  assert.equal(normalizeIdentifier("  Marc.Dupont "), "marc.dupont");
  assert.ok(isValidIdentifier("Marc_75"));
  assert.ok(!isValidIdentifier("ab"));
  assert.ok(!isValidIdentifier("marc dupont"));
  assert.ok(!isValidIdentifier("marc;drop table"));
  assert.ok(!isValidIdentifier(undefined));
});

test("une session signée se relit, avec le compte et son offre", () => {
  const token = signSession(ACCOUNT, SECRET, NOW);
  assert.deepEqual(readSession(token, SECRET, NOW + 1000), ACCOUNT);
});

test("la session ne contient aucun mot de passe et ne se falsifie pas", () => {
  const token = signSession(ACCOUNT, SECRET, NOW);
  assert.equal(readSession(token, "autre-secret", NOW), null);
  const [prefix, body, signature] = token.split(".").length === 3 ? token.split(".") : [];
  assert.ok(prefix && body && signature);
  const forged = Buffer.from(JSON.stringify({ ...ACCOUNT, tier: "owner", exp: Math.floor(NOW / 1000) + 99999 })).toString("base64url");
  assert.equal(readSession(`${prefix}.${forged}.${signature}`, SECRET, NOW), null);
  assert.equal(readSession(`${prefix}.${body}`, SECRET, NOW), null);
  assert.equal(readSession("pas-une-session", SECRET, NOW), null);
});

test("une session expire au bout de sept jours", () => {
  const token = signSession(ACCOUNT, SECRET, NOW);
  assert.ok(readSession(token, SECRET, NOW + 6 * 86_400_000));
  assert.equal(readSession(token, SECRET, NOW + 8 * 86_400_000), null);
});
