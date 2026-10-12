import { NextResponse } from "next/server";
import { adminConfigured, isAdmin } from "@/lib/adminAuth";
import { listCloudDossiers } from "@/lib/investigationCloud";

// Liste des dossiers copiés en ligne. Réservé au mot de passe d'administration.
export async function GET() {
  if (!adminConfigured()) {
    return NextResponse.json({ error: "ADMIN_PASSWORD n'est pas configuré sur le serveur.", code: "not_configured" }, { status: 503 });
  }
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Mot de passe requis.", code: "locked" }, { status: 401 });
  }
  try {
    return NextResponse.json({ dossiers: await listCloudDossiers() });
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
