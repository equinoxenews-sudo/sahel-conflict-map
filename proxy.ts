import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, adminConfigured, isValidSessionToken } from "@/lib/adminAuth";
import { gateDecision, gateEnabled, isMachinePath, maintenanceOn } from "@/lib/siteGate";

// Porte d'entrée : voir lib/siteGate.ts. Le site entier demande l'identifiant et le mot de passe du compte.
const MAINTENANCE_PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Maintenance — EQUINOXE News</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#05080f;color:#e8ecf4;font-family:system-ui,sans-serif;text-align:center;padding:24px}h1{font-size:20px;margin:0 0 8px}p{margin:0;color:#9aa6bd;font-size:15px}</style></head><body><div><h1>EQUINOXE News</h1><p>Le site est momentanément hors ligne. Il sera de retour bientôt.</p></div><script>setInterval(function(){fetch("/api/session",{cache:"no-store"}).then(function(r){if(r.status!==503)location.reload()}).catch(function(){})},30000)</script></body></html>`;

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Maintenance : tout est hors ligne sauf les routes des tâches planifiées (qui gardent les données à jour).
  if (maintenanceOn(process.env) && !isMachinePath(pathname)) {
    const headers = { "retry-after": "3600", "cache-control": "no-store", "x-robots-tag": "noindex" };
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Site hors ligne (maintenance)." }, { status: 503, headers });
    return new NextResponse(MAINTENANCE_PAGE, { status: 503, headers: { ...headers, "content-type": "text/html; charset=utf-8" } });
  }

  if (!gateEnabled(process.env, adminConfigured())) return NextResponse.next();

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
