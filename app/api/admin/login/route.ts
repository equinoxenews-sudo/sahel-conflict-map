import { NextResponse } from "next/server";
import { authenticate } from "@/lib/accountStore";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  accountId,
  adminConfigured,
  isEligibleIndividual,
  loginAvailable,
  normalizeIdentifier,
  sessionTokenFor,
  tokenForCredentials,
} from "@/lib/adminAuth";

// Connexion. Le compte du fondateur (identifiant Nicof ou ADMIN_USER + ADMIN_PASSWORD) se reconnaît d'abord, sans base
// de données ; tout autre identifiant est cherché parmi les comptes individuels (table `accounts`).
export async function POST(request: Request) {
  if (!loginAvailable()) {
    return NextResponse.json({ error: "Aucune connexion n'est configurée sur le serveur (ADMIN_PASSWORD)." }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as { identifier?: unknown; password?: unknown } | null;
  const identifier = typeof body?.identifier === "string" ? normalizeIdentifier(body.identifier) : "";

  let user: string | null = null;
  let token: string | null = null;

  if (identifier === normalizeIdentifier(accountId())) {
    // L'identifiant du fondateur n'appartient qu'à lui : jamais cherché dans la table des comptes.
    if (adminConfigured()) {
      token = tokenForCredentials(body?.identifier, body?.password);
      user = accountId();
    }
  } else {
    const account = await authenticate(body?.identifier, body?.password);
    if (account && isEligibleIndividual(account)) {
      token = sessionTokenFor(account);
      user = account.name;
    }
  }

  if (!token || !user) {
    // Un identifiant ou un mot de passe faux fait attendre : on ne peut pas enchaîner des essais à toute vitesse.
    await new Promise((resolve) => setTimeout(resolve, 900));
    return NextResponse.json({ error: "Identifiant ou mot de passe incorrect." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, user });
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // « lax » et non « strict » : avec la porte d'entrée, un lien venu d'ailleurs (message, courriel) doit arriver
    // connecté. Les envois de formulaire d'un autre site restent refusés.
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return response;
}
