import { analystV2Zones } from "./analystZones";
import { isSportsTitle } from "./sportsFilter";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { fetchChannel, type TelegramPost } from "./telegram";
import { TELEGRAM_CHANNELS } from "./telegramChannels";
import { ZONE_KEYWORDS } from "./zoneKeywords";

// Collecte des messages Telegram des zones « analyste » (lib/analystZones.ts) dans
// la table telegram_posts (supabase/add-analyst-v2.sql). Ces messages ne
// deviennent pas des synthèses à eux seuls : ils sont proposés à l'analyste en
// complément des articles de presse (lib/syncBriefs.ts).

const MAX_AGE_HOURS = 72;
const MIN_TEXT_LENGTH = 80;

// Plusieurs canaux généralistes publient en russe : noms de pays en cyrillique,
// en plus des mots-clés français et anglais des zones.
const EXTRA_KEYWORDS: Record<string, string[]> = {
  afrique: ["Мали", "Буркина", "Нигер", "Судан", "Сомали", "Конго", "Сахел", "Африк", "Мозамбик", "Чад", "ЦАР"],
  europe: ["Украин", "Киев", "Харьков", "Запорож", "Донецк", "Херсон", "Курск", "Белгород", "НАТО", "Европ", "Молдав", "Сербия", "Косово"],
  "moyen-orient": ["Израил", "Газа", "Газе", "Газы", "Сири", "Ливан", "Иран", "Ирак", "Йемен", "Хезболл", "ХАМАС", "Хуси"],
  indopacifique: ["Китай", "Тайван", "КНДР", "Корея", "Япони", "Филиппин", "Мьянм", "Вьетнам", "Индонез"],
  "amerique-du-sud": ["Венесуэл", "Колумби", "Бразили", "Мексик", "Аргентин", "Эквадор", "Гаити", "Перу", "Боливи"],
};

/** Zone d'un message d'un canal généraliste : la première dont il cite un pays. */
export function zoneForText(text: string, zones: string[]): string | null {
  const lower = text.toLowerCase();
  for (const zone of zones) {
    const keywords = [...(ZONE_KEYWORDS[zone] ?? []), ...(EXTRA_KEYWORDS[zone] ?? [])];
    if (keywords.some((k) => lower.includes(k.toLowerCase()))) return zone;
  }
  return null;
}

export async function syncTelegram(now = Date.now()) {
  const zones = analystV2Zones();
  const channels = TELEGRAM_CHANNELS.filter((c) => c.zone === null || zones.includes(c.zone));
  const results = await Promise.all(channels.map(async (c) => ({ channel: c, posts: await fetchChannel(c.handle) })));

  const rows: { channel: string; zone_slug: string; url: string; text: string; image_url: string | null; published_at: string | null }[] = [];
  const perChannel: Record<string, number> = {};
  for (const { channel, posts } of results) {
    perChannel[channel.handle] = posts.length;
    for (const p of posts as TelegramPost[]) {
      if (p.text.length < MIN_TEXT_LENGTH || isSportsTitle(p.text.slice(0, 200))) continue;
      if (p.publishedAt && now - Date.parse(p.publishedAt) > MAX_AGE_HOURS * 3600_000) continue;
      const zone = channel.zone ?? zoneForText(p.text, zones);
      if (!zone || !zones.includes(zone)) continue;
      rows.push({ channel: channel.handle, zone_slug: zone, url: p.url, text: p.text, image_url: p.imageUrl, published_at: p.publishedAt });
    }
  }

  if (rows.length) {
    // ignoreDuplicates : un message déjà connu garde son état (déjà utilisé ou non).
    const { error } = await getSupabaseAdmin().from("telegram_posts").upsert(rows, { onConflict: "url", ignoreDuplicates: true });
    if (error) throw new Error(`Telegram : enregistrement impossible (${error.message})`);
  }
  return { channels: perChannel, kept: rows.length };
}
