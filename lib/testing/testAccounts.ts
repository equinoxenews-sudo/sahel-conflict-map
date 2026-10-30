import type { Tier } from "../accounts";

// Comptes de TEST, pour les essais locaux et les tests automatiques uniquement. Ce sont des valeurs jetables générées au
// hasard : elles n'ont aucun rapport avec un vrai compte, et la base factice qui les connaît (lib/testing/fakeSupabase.ts)
// n'existe jamais en production. Les vrais comptes se créent avec scripts/create-account.ts.
export interface TestAccount {
  identifier: string;
  displayName: string;
  password: string;
  tier: Tier;
}

export const TEST_ACCOUNTS: readonly TestAccount[] = [
  { identifier: "test-alice", displayName: "Test-Alice", password: "ecJtOcOM2Bjd-test", tier: "plus" },
  { identifier: "test-bruno", displayName: "Test-Bruno", password: "s46gkQ-W2nDR-test", tier: "plus" },
];

/** Mot de passe du compte fondateur pour les essais locaux (à poser dans .env.local : ADMIN_PASSWORD). */
export const TEST_FOUNDER_PASSWORD = "RanAO1jcFRxw-test";
