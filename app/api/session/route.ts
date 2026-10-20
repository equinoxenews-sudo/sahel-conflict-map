import { NextResponse } from "next/server";
import { currentUser } from "@/lib/adminAuth";

// Qui est connecté : lu par le menu du site après le chargement de la page, pour que les pages publiques
// restent en cache (leur contenu ne dépend pas du visiteur).
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ user: await currentUser() }, { headers: { "cache-control": "no-store" } });
}
