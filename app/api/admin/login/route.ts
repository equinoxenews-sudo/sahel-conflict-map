import { NextResponse } from "next/server";
import { authenticate } from "@/lib/accountStore";
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, accountId, adminConfigured, sessionTokenFor, tokenForCredentials } from "@/lib/adminAuth";

// Connexion : d'abord les comptes individuels (table `accounts`), puis le compte du fondateur (ADMIN_PASSWORD).
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { identifier?: unknown; password?: unknown } | null;

  let user: string | null = null;
  let token: string | null = null;

  const account = await authenticate(body?.identifier, body?.password);
  if (account) {
    token = sessionTokenFor(account);
    user = account.name;
  } else if (adminConfigured()) {
    token = tokenForCredentials(body?.identifier, body?.password);
    user = accountId();
  } else if (!signingAvailable()) {
    return NextResponse.json({ error: "Aucune connexion n'est configurée sur le serveur." }, { status: 503 });
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
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return response;
}

/** Sans ADMIN_PASSWORD, la connexion n'a de sens que si le serveur sait signer des sessions (clé de service présente). */
function signingAvailable(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}
