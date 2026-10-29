import { NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, accountId, adminConfigured, tokenForCredentials } from "@/lib/adminAuth";

export async function POST(request: Request) {
  if (!adminConfigured()) {
    return NextResponse.json({ error: "ADMIN_PASSWORD n'est pas configuré sur le serveur." }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as { identifier?: unknown; password?: unknown } | null;
  const token = tokenForCredentials(body?.identifier, body?.password);
  if (!token) {
    // Un identifiant ou un mot de passe faux fait attendre : on ne peut pas enchaîner des essais à toute vitesse.
    await new Promise((resolve) => setTimeout(resolve, 900));
    return NextResponse.json({ error: "Identifiant ou mot de passe incorrect." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true, user: accountId() });
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
