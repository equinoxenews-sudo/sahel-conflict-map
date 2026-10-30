import { NextResponse } from "next/server";
import { getOrCreateCode } from "@/lib/accountCodes";
import { tierLabel } from "@/lib/accountProfile";
import { currentAccount } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// Le profil du compte connecté : pseudo, accès et IDcode. Le mot de passe n'existe nulle part (seul son hachage), il n'est
// donc jamais renvoyé. Si la table des IDcode n'existe pas encore (SQL pas exécuté), le profil s'affiche sans code.
export async function GET() {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Connexion requise." }, { status: 401, headers: { "cache-control": "no-store" } });
  let code: string | null = null;
  let codeError: string | null = null;
  try {
    code = await getOrCreateCode(account.id);
  } catch (error) {
    codeError = /account_codes|relation|does not exist|schema cache/i.test(error instanceof Error ? error.message : String(error))
      ? "L'IDcode n'est pas encore activé sur le serveur."
      : "IDcode momentanément indisponible.";
  }
  return NextResponse.json(
    { name: account.name, id: account.id, tier: account.tier, access: tierLabel(account.tier), code, codeError },
    { headers: { "cache-control": "no-store" } },
  );
}
