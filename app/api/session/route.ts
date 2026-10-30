import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/adminAuth";

// Qui est connecté : lu par le menu du site après le chargement de la page, pour que les pages publiques
// restent en cache (leur contenu ne dépend pas du visiteur). `id` est l'identifiant normalisé du compte : « Mon espace »
// s'en sert pour vérifier que la page affichée est bien celle du compte connecté.
export const dynamic = "force-dynamic";

export async function GET() {
  const account = await currentAccount();
  return NextResponse.json({ user: account?.name ?? null, id: account?.id ?? null }, { headers: { "cache-control": "no-store" } });
}
