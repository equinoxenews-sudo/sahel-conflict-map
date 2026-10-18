// Illustration de repli d'un article : la photo Wikipédia de la ville où se passe
// l'événement, quand aucune photo de source n'est utilisable (par exemple les mises à jour
// d'un direct, qui partagent toutes la même image sans rapport avec le sujet). Une photo du
// lieu est en rapport avec l'article, et les images de Wikipédia sont sous licence libre.
// Seulement les villes : l'image d'un pays est souvent un drapeau ou une carte.

const cache = new Map<string, string | null>();
const TIMEOUT_MS = 6000;

interface Summary {
  type?: string;
  thumbnail?: { source?: string; width?: number };
  originalimage?: { source?: string; width?: number };
}

async function summary(lang: string, title: string): Promise<Summary | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
      signal: controller.signal,
      headers: { "User-Agent": "EquinoxeNewsBot/1.0 (https://sahel-conflict-map.vercel.app)" },
    });
    return res.ok ? ((await res.json()) as Summary) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Photo de la ville (largeur ~960 px), ou null si Wikipédia n'en a pas. */
export async function placeImage(city: string | null, country: string | null): Promise<string | null> {
  const name = city?.trim();
  if (!name) return null;
  const key = `${name}|${country ?? ""}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  let url: string | null = null;
  for (const [lang, title] of [["fr", name], ["en", name], ["fr", `${name} (${country ?? ""})`]] as const) {
    const s = await summary(lang, title);
    // Page d'homonymie : pas d'image fiable.
    if (!s || s.type === "disambiguation") continue;
    const src = s.originalimage?.source ?? s.thumbnail?.source;
    // Écarte les cartes, blasons et drapeaux (fichiers SVG ou « map », « flag », « coat »).
    if (src && !/\.svg|map|flag|coat|blason|drapeau|locator|location/i.test(src)) {
      // Original de taille raisonnable : tel quel. Très grand : miniature de 960 px (une
      // miniature plus large que l'original n'existe pas et donnerait une image cassée).
      const width = s.originalimage?.width ?? 0;
      url = width > 1600 && s.thumbnail?.source ? s.thumbnail.source.replace(/\/(\d+)px-/, "/960px-") : src;
      break;
    }
  }
  cache.set(key, url);
  return url;
}
