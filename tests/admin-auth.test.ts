import assert from "node:assert/strict";
import test from "node:test";
import { accountId, adminConfigured, normalizeIdentifier, tokenForCredentials } from "../lib/adminAuth";

function withEnv(values: Record<string, string | undefined>, run: () => void) {
  const saved = { ADMIN_PASSWORD: process.env.ADMIN_PASSWORD, ADMIN_USER: process.env.ADMIN_USER };
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("l'identifiant par défaut est Nicof", () => {
  withEnv({ ADMIN_USER: undefined }, () => assert.equal(accountId(), "Nicof"));
  withEnv({ ADMIN_USER: "Autre" }, () => assert.equal(accountId(), "Autre"));
});

test("l'identifiant se compare sans casse ni espaces", () => {
  assert.equal(normalizeIdentifier("  NICOF "), "nicof");
});

test("connexion : bon identifiant et bon mot de passe seulement", () => {
  withEnv({ ADMIN_PASSWORD: "mot-de-passe-de-test", ADMIN_USER: undefined }, () => {
    assert.ok(adminConfigured());
    const token = tokenForCredentials("Nicof", "mot-de-passe-de-test");
    assert.ok(token);
    assert.equal(tokenForCredentials("  nicof ", "mot-de-passe-de-test"), token);
    assert.equal(tokenForCredentials("Nicof", "autre"), null);
    assert.equal(tokenForCredentials("quelquun", "mot-de-passe-de-test"), null);
    assert.equal(tokenForCredentials("", ""), null);
    assert.equal(tokenForCredentials(undefined, "mot-de-passe-de-test"), null);
    assert.equal(tokenForCredentials("Nicof", 123), null);
  });
});

test("sans mot de passe configuré, aucune connexion n'est possible", () => {
  withEnv({ ADMIN_PASSWORD: undefined }, () => {
    assert.equal(adminConfigured(), false);
    assert.equal(tokenForCredentials("Nicof", "x"), null);
  });
});

test("le jeton ne contient ni l'identifiant ni le mot de passe", () => {
  withEnv({ ADMIN_PASSWORD: "mot-de-passe-de-test" }, () => {
    const token = tokenForCredentials("Nicof", "mot-de-passe-de-test") ?? "";
    assert.match(token, /^[0-9a-f]{64}$/);
  });
});
