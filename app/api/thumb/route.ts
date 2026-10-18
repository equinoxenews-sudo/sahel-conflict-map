import { NextResponse } from "next/server";

// Relais d'images pour le globe : le moteur 3D (WebGL) ne peut dessiner une image d'un autre
// site que si celui-ci l'autorise (CORS), ce que la plupart des médias ne font pas. Cette
// route récupère la vignette d'un article et la renvoie depuis l'adresse du site, mise en
// cache un jour. Garde-fous : https uniquement, images seulement, 3 Mo au plus, 6 s au plus.

const MAX_BYTES = 3 * 1024 * 1024;
const TIMEOUT_MS = 6000;

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url");
  let target: URL;
  try {
    target = new URL(raw ?? "");
  } catch {
    return NextResponse.json({ error: "Adresse invalide" }, { status: 400 });
  }
  // Pas d'adresse interne (localhost, réseau privé) : seulement des sites publics en https.
  if (target.protocol !== "https:" || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/.test(target.hostname)) {
    return NextResponse.json({ error: "Adresse refusée" }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(target, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; EquinoxeNewsBot/1.0; +https://sahel-conflict-map.vercel.app)" },
      redirect: "follow",
    });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/") || type.includes("svg")) {
      return NextResponse.json({ error: "Image indisponible" }, { status: 404 });
    }
    const length = Number(res.headers.get("content-length") ?? 0);
    if (length > MAX_BYTES) return NextResponse.json({ error: "Image trop lourde" }, { status: 413 });
    const body = await res.arrayBuffer();
    if (body.byteLength > MAX_BYTES) return NextResponse.json({ error: "Image trop lourde" }, { status: 413 });
    return new NextResponse(body, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image indisponible" }, { status: 504 });
  } finally {
    clearTimeout(timer);
  }
}
