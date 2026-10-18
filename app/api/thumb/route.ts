import { NextResponse } from "next/server";
import { isTelegramImage } from "@/lib/imageUrls";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { fetchPostImage } from "@/lib/telegram";

// Relais d'images : le moteur 3D (WebGL) ne peut dessiner une image d'un autre site que si
// celui-ci l'autorise (CORS), ce que la plupart des médias ne font pas. Cette route récupère
// la vignette d'un article et la renvoie depuis l'adresse du site, mise en cache un jour.
// Elle sert aussi aux images de Telegram, dont l'adresse expire au bout de quelques heures :
// si l'image ne répond plus, le message d'origine est retrouvé et son image actuelle servie.
// Garde-fous : https uniquement, images seulement, 3 Mo au plus, 6 s au plus.

const MAX_BYTES = 3 * 1024 * 1024;
const TIMEOUT_MS = 6000;

type Fetched = { body: ArrayBuffer; type: string } | { error: string; status: number };

async function fetchImage(target: URL): Promise<Fetched> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(target, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; EquinoxeNewsBot/1.0; +https://sahel-conflict-map.vercel.app)" },
      redirect: "follow",
    });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/") || type.includes("svg")) return { error: "Image indisponible", status: 404 };
    const length = Number(res.headers.get("content-length") ?? 0);
    if (length > MAX_BYTES) return { error: "Image trop lourde", status: 413 };
    const body = await res.arrayBuffer();
    if (body.byteLength > MAX_BYTES) return { error: "Image trop lourde", status: 413 };
    return { body, type };
  } catch {
    return { error: "Image indisponible", status: 504 };
  } finally {
    clearTimeout(timer);
  }
}

/** Image Telegram expirée : adresse actuelle de l'image du message qui la portait. */
async function refreshTelegramImage(expired: string): Promise<URL | null> {
  try {
    const { data } = await getSupabaseAdmin().from("telegram_posts").select("url").eq("image_url", expired).limit(1);
    const postUrl = (data?.[0] as { url?: string } | undefined)?.url;
    const fresh = postUrl ? await fetchPostImage(postUrl) : null;
    return fresh && isTelegramImage(fresh) ? new URL(fresh) : null;
  } catch {
    return null;
  }
}

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

  let result = await fetchImage(target);
  if ("error" in result && isTelegramImage(target.href)) {
    const fresh = await refreshTelegramImage(raw!);
    if (fresh) result = await fetchImage(fresh);
  }
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return new NextResponse(result.body, {
    headers: {
      "Content-Type": result.type,
      "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
    },
  });
}
