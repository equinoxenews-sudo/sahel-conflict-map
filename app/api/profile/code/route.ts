import { NextResponse } from "next/server";
import { regenerateCode } from "@/lib/accountCodes";
import { currentAccount } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// Remplace l'IDcode du compte connecté par un nouveau (l'ancien cesse de fonctionner).
export async function POST() {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  try {
    return NextResponse.json({ code: await regenerateCode(account.id) }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "IDcode momentanément indisponible." }, { status: 500 });
  }
}
