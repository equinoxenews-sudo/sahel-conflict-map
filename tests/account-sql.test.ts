import assert from "node:assert/strict";
import test from "node:test";
import { accountInsertSql, isFounderIdentifier } from "../lib/accountSql";
import { verifyPassword } from "../lib/accounts";

const FOUNDERS = ["Nicof", ""];
const GOOD = { identifier: "Marc.Dupont", tier: "plus", password: "valeur-de-test-0123", confirmation: "valeur-de-test-0123" };

test("le SQL contient le hachage salé, jamais le mot de passe", () => {
  const sql = accountInsertSql(GOOD, FOUNDERS);
  assert.ok(!sql.includes(GOOD.password));
  assert.match(sql, /^insert into accounts \(identifier, display_name, password_hash, tier\)/);
  assert.ok(sql.includes("'marc.dupont'"));
  assert.ok(sql.includes("'Marc.Dupont'"));
  assert.ok(sql.includes("'plus'"));
  const hash = /'(scrypt\$[^']+)'/.exec(sql)?.[1];
  assert.ok(hash);
  assert.equal(verifyPassword(GOOD.password, hash), true);
  assert.equal(verifyPassword("autre-chose-0123", hash), false);
});

test("deux créations du même mot de passe donnent deux hachages différents", () => {
  assert.notEqual(accountInsertSql(GOOD, FOUNDERS), accountInsertSql(GOOD, FOUNDERS));
});

test("l'identifiant du fondateur est refusé, quelle que soit la casse", () => {
  assert.throws(() => accountInsertSql({ ...GOOD, identifier: "nicof" }, FOUNDERS), /fondateur/);
  assert.throws(() => accountInsertSql({ ...GOOD, identifier: "  NICOF " }, FOUNDERS), /fondateur/);
  assert.throws(() => accountInsertSql({ ...GOOD, identifier: "chef" }, ["Nicof", "Chef"]), /fondateur/);
  assert.equal(isFounderIdentifier("marc", FOUNDERS), false);
});

test("l'offre « owner » est refusée à un compte individuel", () => {
  assert.throws(() => accountInsertSql({ ...GOOD, tier: "owner" }, FOUNDERS), /owner/);
  assert.throws(() => accountInsertSql({ ...GOOD, tier: "gratuit" }, FOUNDERS), /Offre inconnue/);
});

test("les saisies invalides sont refusées avant tout SQL", () => {
  assert.throws(() => accountInsertSql({ ...GOOD, identifier: "ab" }, FOUNDERS), /Identifiant invalide/);
  assert.throws(() => accountInsertSql({ ...GOOD, identifier: "marc'; drop table accounts;--" }, FOUNDERS), /Identifiant invalide/);
  assert.throws(() => accountInsertSql({ ...GOOD, confirmation: "autre-valeur-0123" }, FOUNDERS), /différents/);
  assert.throws(() => accountInsertSql({ ...GOOD, password: "court", confirmation: "court" }, FOUNDERS), /trop court/);
});

test("une apostrophe dans le hachage ou le nom ne casse pas le SQL", () => {
  const sql = accountInsertSql(GOOD, FOUNDERS, () => "scrypt$1$1$1$a'b$c");
  assert.ok(sql.includes("'scrypt$1$1$1$a''b$c'"));
});
