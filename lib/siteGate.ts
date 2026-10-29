// Porte d'entrée du site : sans connexion (identifiant + mot de passe du compte), toute page renvoie vers /acces et
// toute route de l'API répond 401. Les décisions sont ici, sans accès aux requêtes, pour être testées ; proxy.ts les applique.

/** Pages et fichiers qui restent ouverts : la page de connexion, son logo, et ce que les robots exigent. */
const OPEN_EXACT = new Set(["/acces", "/api/admin/login", "/favicon.ico", "/robots.txt", "/equinoxe/logo-equinoxe-wordmark.png"]);

/**
 * Routes appelées par des machines (tâches planifiées de Vercel, GitHub Actions, Telegram) : elles n'ont pas de cookie,
 * mais chacune exige son propre secret (CRON_SECRET en « Authorization: Bearer », TELEGRAM_WEBHOOK_SECRET).
 */
const OPEN_PREFIXES = ["/api/sync-", "/api/cron/", "/api/revalidate", "/api/telegram/webhook"];

/** Routes des machines seulement (sans la page de connexion) : elles restent actives pendant une maintenance. */
export function isMachinePath(pathname: string): boolean {
  return OPEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** Maintenance : le site entier répond « hors ligne » (SITE_MAINTENANCE = on, 1 ou true), connexion comprise. */
export function maintenanceOn(env: Readonly<Record<string, string | undefined>>): boolean {
  return ["on", "1", "true"].includes(env.SITE_MAINTENANCE?.trim().toLowerCase() ?? "");
}

export function isOpenPath(pathname: string): boolean {
  return OPEN_EXACT.has(pathname) || OPEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export type GateDecision = "allow" | "login" | "deny";

/** Laisser passer, renvoyer vers la page de connexion (pages), ou refuser (API). */
export function gateDecision(pathname: string, signedIn: boolean): GateDecision {
  if (signedIn || isOpenPath(pathname)) return "allow";
  return pathname.startsWith("/api/") ? "deny" : "login";
}

/**
 * La porte est active sauf en développement local sans mot de passe configuré, ou si SITE_GATE vaut « off »
 * (interrupteur de secours : à poser dans Vercel puis redéployer si l'accès devenait impossible).
 */
export function gateEnabled(env: { SITE_GATE?: string; NODE_ENV?: string }, passwordConfigured: boolean): boolean {
  if (env.SITE_GATE?.trim().toLowerCase() === "off") return false;
  return passwordConfigured || env.NODE_ENV === "production";
}

/** Page où revenir après la connexion : un chemin du site seulement (jamais une autre adresse), sinon l'accueil. */
export function safeReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (value === "/acces" || value.startsWith("/acces?") || value.startsWith("/acces/")) return "/";
  return value;
}
