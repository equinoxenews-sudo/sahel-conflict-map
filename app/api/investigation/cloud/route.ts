import { NextResponse } from "next/server";
import { currentAccount, loginAvailable } from "@/lib/adminAuth";
import { ACCOUNT_HEADER, cloudOwnerOf, requestMatchesAccount } from "@/lib/accountScope";
import { listCloudDossiers } from "@/lib/investigationCloud";

// Liste des dossiers copiés en ligne PAR LE COMPTE CONNECTÉ : un compte ne voit jamais les dossiers d'un autre.
export async function GET(request: Request) {
  if (!loginAvailable()) {
    return NextResponse.json({ error: "ADMIN_PASSWORD n'est pas configuré sur le serveur.", code: "not_configured" }, { status: 503 });
  }
  const account = await currentAccount();
  if (!account) {
    return NextResponse.json({ error: "Connexion requise.", code: "locked" }, { status: 401 });
  }
  if (!requestMatchesAccount(request.headers.get(ACCOUNT_HEADER), account)) {
    return NextResponse.json({ error: "Le compte connecté a changé depuis l'ouverture de cette page : recharge la page.", code: "account_changed" }, { status: 409 });
  }
  try {
    return NextResponse.json({ dossiers: await listCloudDossiers(cloudOwnerOf(account)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const missing = /investigation_cloud|relation|does not exist|schema cache/i.test(message);
    return NextResponse.json(
      {
        error: missing
          ? "Les tables de synchronisation n'existent pas : exécuter supabase/add-investigation-cloud.sql dans Supabase."
          : message,
        code: missing ? "no_tables" : "error",
      },
      { status: missing ? 503 : 500 },
    );
  }
}
