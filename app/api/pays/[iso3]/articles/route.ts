import { NextResponse } from "next/server";
import { getCountryArticles } from "@/lib/countryArticles";

// Articles d'un pays pour le panneau du globe : étiquetés avec ce pays, ou le nommant dans leur titre ou leur résumé (60 derniers jours).
const ISO3 = /^[A-Za-z]{3}$/;

export async function GET(_request: Request, { params }: { params: Promise<{ iso3: string }> }) {
  const { iso3 } = await params;
  if (!ISO3.test(iso3)) return NextResponse.json({ error: "Code pays invalide." }, { status: 400 });
  const articles = await getCountryArticles(iso3.toUpperCase());
  return NextResponse.json({ articles }, { headers: { "Cache-Control": "private, max-age=120" } });
}
