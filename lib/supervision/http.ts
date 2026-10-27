import { NextResponse } from "next/server";
import { SupervisionError } from "./store";

/** Réponse JSON d'une erreur de la Supervision : le code HTTP suit la nature de l'erreur, jamais le détail interne. */
export function supervisionFailure(error: unknown) {
  if (error instanceof SupervisionError) {
    const status = error.code === "not_found" ? 404 : error.code === "forbidden" ? 403 : error.code === "limit" ? 409 : 500;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  return NextResponse.json({ error: "Supervision indisponible pour le moment.", code: "error" }, { status: 500 });
}
