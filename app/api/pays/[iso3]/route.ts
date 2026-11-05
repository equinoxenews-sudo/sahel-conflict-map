import { NextResponse } from "next/server";
import { buildCountryPanel } from "@/lib/countryPanel";

// Panneau pays du globe : données du pays cliqué (identité, chiffres clés, indice de puissance, relations). Lecture seule, sans IA.
const ISO3 = /^[A-Za-z]{3}$/;

export async function GET(_request: Request, { params }: { params: Promise<{ iso3: string }> }) {
  const { iso3 } = await params;
  if (!ISO3.test(iso3)) return NextResponse.json({ error: "Code pays invalide." }, { status: 400 });
  return NextResponse.json(buildCountryPanel(iso3), { headers: { "Cache-Control": "private, max-age=600" } });
}
