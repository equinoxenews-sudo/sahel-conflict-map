import { NextResponse } from "next/server";
import type { Account } from "../accounts";
import { loadActiveAccount } from "../accountStore";
import { currentAccount, privateAccessOpen } from "../adminAuth";
import { activeLimit } from "./model";

// Accès aux routes de la Supervision : un compte connecté dont l'offre comprend la Supervision. En développement local
// sans mot de passe configuré, l'espace est ouvert (comme le reste de « Mon espace ») avec un compte fondateur fictif.

const DEV_ACCOUNT: Account = { id: "dev-local", name: "dev-local", tier: "owner", timezone: "Europe/Paris" };

export type Access = { ok: true; account: Account } | { ok: false; response: NextResponse };

export async function requireSupervisionAccount(): Promise<Access> {
  let account = await currentAccount();
  if (!account && (await privateAccessOpen())) account = DEV_ACCOUNT;
  if (!account) {
    return { ok: false, response: NextResponse.json({ error: "Connexion requise.", code: "locked" }, { status: 401 }) };
  }
  // Une session déjà ouverte ne contourne pas une suspension : les comptes individuels sont revérifiés en base.
  if (account.tier !== "owner") {
    const fresh = await loadActiveAccount(account.id);
    if (!fresh) return { ok: false, response: NextResponse.json({ error: "Compte suspendu ou introuvable.", code: "locked" }, { status: 401 }) };
    account = fresh;
  }
  if (activeLimit(account.tier) === 0) {
    return { ok: false, response: NextResponse.json({ error: "Ton offre ne comprend pas la Supervision.", code: "forbidden" }, { status: 403 }) };
  }
  return { ok: true, account };
}
