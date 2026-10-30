process.env.EQUINOXE_FAKE_DB = "1";

import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { authenticate, loadActiveAccount } from "../lib/accountStore";
import { signSession, type Account } from "../lib/accounts";
import { accountFromCookie, isEligibleIndividual, isValidSessionToken, loginAvailable, sessionTokenFor, tokenForCredentials } from "../lib/adminAuth";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import { resetFakeDb } from "../lib/testing/fakeSupabase";
import { TEST_ACCOUNTS, TEST_FOUNDER_PASSWORD } from "../lib/testing/testAccounts";

const [ALICE, BRUNO] = TEST_ACCOUNTS;

function withEnv(values: Record<string, string | undefined>, run: () => Promise<void> | void) {
  const keys = Object.keys(values);
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  const restore = () => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
  let result: Promise<void> | void;
  try {
    result = run();
  } catch (error) {
    restore();
    throw error;
  }
  return Promise.resolve(result).finally(restore);
}

const ENV = { ADMIN_PASSWORD: TEST_FOUNDER_PASSWORD, ADMIN_USER: undefined, SUPABASE_SERVICE_ROLE_KEY: "cle-de-service-de-test" };

beforeEach(() => resetFakeDb());

test("les comptes de test se connectent avec leur mot de passe, et seulement avec lui", async () => {
  const account = await authenticate(ALICE.identifier, ALICE.password);
  assert.ok(account);
  assert.equal(account.id, "test-alice");
  assert.equal(account.tier, "plus");
  assert.equal(await authenticate(ALICE.identifier, BRUNO.password), null);
  assert.equal(await authenticate("TEST-ALICE ", ALICE.password).then((a) => a?.id), "test-alice");
  assert.equal(await authenticate("inconnu", ALICE.password), null);
  assert.equal(await authenticate(ALICE.identifier, ""), null);
});

test("un compte suspendu ne se connecte plus", async () => {
  await getSupabaseAdmin().from("accounts").upsert({ identifier: "test-alice", disabled: true });
  assert.equal(await authenticate(ALICE.identifier, ALICE.password), null);
  assert.equal(await loadActiveAccount("test-alice"), null);
});

test("le cookie du fondateur est reconnu, avec l'offre « owner »", async () => {
  await withEnv(ENV, async () => {
    const token = tokenForCredentials("Nicof", TEST_FOUNDER_PASSWORD);
    assert.ok(token);
    const account = await accountFromCookie(token ?? undefined);
    assert.equal(account?.tier, "owner");
    assert.equal(account?.id, "nicof");
    assert.equal(isValidSessionToken(token ?? undefined), true);
  });
});

test("le cookie d'un compte individuel donne ce compte, relu en base", async () => {
  await withEnv(ENV, async () => {
    const account = await authenticate(ALICE.identifier, ALICE.password);
    assert.ok(account);
    const token = sessionTokenFor(account);
    assert.ok(token);
    assert.equal(isValidSessionToken(token ?? undefined), true);
    const current = await accountFromCookie(token ?? undefined);
    assert.equal(current?.id, "test-alice");
    assert.equal(current?.tier, "plus");
  });
});

test("une session déjà ouverte ne survit pas à la suspension du compte", async () => {
  await withEnv(ENV, async () => {
    const token = sessionTokenFor((await authenticate(ALICE.identifier, ALICE.password)) as Account) ?? undefined;
    assert.ok(await accountFromCookie(token));
    await getSupabaseAdmin().from("accounts").upsert({ identifier: "test-alice", disabled: true });
    assert.equal(await accountFromCookie(token), null);
  });
});

test("une offre rétrogradée ou changée en base prend effet tout de suite, sans nouvelle connexion", async () => {
  await withEnv(ENV, async () => {
    const token = sessionTokenFor((await authenticate(ALICE.identifier, ALICE.password)) as Account) ?? undefined;
    await getSupabaseAdmin().from("accounts").upsert({ identifier: "test-alice", tier: "pro" });
    assert.equal((await accountFromCookie(token))?.tier, "pro");
  });
});

test("si la base est injoignable, un compte individuel est refusé (échec fermé), pas le fondateur", async () => {
  await withEnv(ENV, async () => {
    const token = sessionTokenFor((await authenticate(ALICE.identifier, ALICE.password)) as Account) ?? undefined;
    const broken = async () => {
      throw new Error("base injoignable");
    };
    assert.equal(await accountFromCookie(token, broken), null);
    const founder = tokenForCredentials("Nicof", TEST_FOUNDER_PASSWORD) ?? undefined;
    assert.equal((await accountFromCookie(founder, broken))?.tier, "owner");
  });
});

test("un cookie falsifié, vide ou signé avec un autre secret est refusé", async () => {
  await withEnv(ENV, async () => {
    const alice = (await authenticate(ALICE.identifier, ALICE.password)) as Account;
    const forged = signSession({ ...alice, tier: "owner" }, "un-autre-secret");
    assert.equal(await accountFromCookie(forged), null);
    assert.equal(isValidSessionToken(forged), false);
    assert.equal(await accountFromCookie(undefined), null);
    assert.equal(await accountFromCookie(""), null);
    assert.equal(await accountFromCookie("v1.n-importe-quoi.signature"), null);
  });
});

test("un compte individuel ne peut ni porter l'offre « owner » ni prendre l'identifiant du fondateur", async () => {
  await withEnv(ENV, async () => {
    const owner: Account = { id: "marc", name: "Marc", tier: "owner", timezone: "Europe/Paris" };
    const impostor: Account = { id: "nicof", name: "Nicof", tier: "plus", timezone: "Europe/Paris" };
    assert.equal(isEligibleIndividual(owner), false);
    assert.equal(isEligibleIndividual(impostor), false);
    assert.equal(isEligibleIndividual({ id: "marc", name: "Marc", tier: "plus", timezone: "Europe/Paris" }), true);

    // Même avec une ligne en base qui dirait « owner » ou « nicof », la session est refusée.
    const db = getSupabaseAdmin();
    await db.from("accounts").upsert({ identifier: "marc", display_name: "Marc", password_hash: "x", tier: "owner", timezone: "Europe/Paris", disabled: false });
    await db.from("accounts").upsert({ identifier: "nicof", display_name: "Nicof", password_hash: "x", tier: "plus", timezone: "Europe/Paris", disabled: false });
    const secret = sessionTokenFor(impostor) ?? undefined;
    assert.equal(await accountFromCookie(secret), null);
    const secret2 = sessionTokenFor(owner) ?? undefined;
    assert.equal(await accountFromCookie(secret2), null);
  });
});

test("l'identifiant du fondateur suit ADMIN_USER", async () => {
  await withEnv({ ...ENV, ADMIN_USER: "Chef" }, async () => {
    const impostor: Account = { id: "chef", name: "Chef", tier: "plus", timezone: "Europe/Paris" };
    assert.equal(isEligibleIndividual(impostor), false);
    assert.equal(isEligibleIndividual({ ...impostor, id: "nicof" }), true);
  });
});

test("sans aucun secret sur le serveur, aucune connexion n'est possible", () => {
  return withEnv({ ADMIN_PASSWORD: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined }, () => {
    assert.equal(loginAvailable(), false);
    assert.equal(sessionTokenFor({ id: "marc", name: "Marc", tier: "plus", timezone: "Europe/Paris" }), null);
  });
});
