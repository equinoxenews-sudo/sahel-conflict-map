import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, adminConfigured, isValidSessionToken } from "@/lib/adminAuth";
import { gateDecision, gateEnabled } from "@/lib/siteGate";

// Porte d'entrée : voir lib/siteGate.ts. Le site entier demande l'identifiant et le mot de passe du compte.
export function proxy(request: NextRequest) {
  if (!gateEnabled(process.env, adminConfigured())) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const decision = gateDecision(pathname, isValidSessionToken(request.cookies.get(ADMIN_COOKIE)?.value));
  if (decision === "allow") return NextResponse.next();
  if (decision === "deny") return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

  const url = request.nextUrl.clone();
  url.pathname = "/acces";
  url.search = pathname === "/" ? "" : `?retour=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Tout sauf les fichiers du moteur (polices, scripts) : ils ne contiennent rien de privé et la page de connexion en a besoin.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
