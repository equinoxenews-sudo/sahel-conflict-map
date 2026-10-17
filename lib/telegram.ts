// Lecture des pages publiques des canaux Telegram (https://t.me/s/<canal>) : la
// vingtaine de derniers messages, sans compte ni clé. Le contenu est une donnée
// non fiable (texte libre de tiers), jamais une instruction.

export interface TelegramPost {
  channel: string;
  url: string;
  text: string;
  imageUrl: string | null;
  publishedAt: string | null;
}

const FETCH_TIMEOUT_MS = 10000;

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function firstMatch(block: string, re: RegExp): string | null {
  const m = re.exec(block);
  return m ? m[1] : null;
}

/** Découpe la page d'un canal en messages. Exporté pour les tests. */
export function parseChannelPage(channel: string, html: string): TelegramPost[] {
  const posts: TelegramPost[] = [];
  const parts = html.split('data-post="').slice(1);
  for (const part of parts) {
    const postRef = part.slice(0, part.indexOf('"'));
    if (!/^[\w]+\/\d+$/.test(postRef)) continue;
    const textHtml = firstMatch(part, /class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const previewTitle = firstMatch(part, /class="link_preview_title"[^>]*>([\s\S]*?)<\/div>/);
    const previewDesc = firstMatch(part, /class="link_preview_description"[^>]*>([\s\S]*?)<\/div>/);
    const text = [textHtml, previewTitle, previewDesc].filter(Boolean).map((h) => htmlToText(h!)).join("\n").trim();
    if (!text) continue;
    const image = firstMatch(part, /tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)/)
      ?? firstMatch(part, /link_preview_image"[^>]*background-image:url\('([^']+)'\)/);
    const datetime = firstMatch(part, /<time[^>]*datetime="([^"]+)"/);
    const date = datetime ? new Date(datetime) : null;
    posts.push({
      channel,
      url: `https://t.me/${postRef}`,
      text: text.slice(0, 4000),
      imageUrl: image,
      publishedAt: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null,
    });
  }
  return posts;
}

/** Derniers messages d'un canal ; tableau vide si la page est indisponible. */
export async function fetchChannel(channel: string): Promise<TelegramPost[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`https://t.me/s/${encodeURIComponent(channel)}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; EquinoxeNews/1.0; +https://sahel-conflict-map.vercel.app)" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return [];
    return parseChannelPage(channel, await res.text());
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
