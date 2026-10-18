import { HOME_NEWS } from "./homeNews";
import { supabase } from "./supabaseClient";

// Bandeau LATEST de l'accueil. Sans aucun appel d'IA :
// 1. les titres épinglés par Nicolas depuis ÉQUINOXE HQ (table ticker_items) ;
// 2. les titres forts des analystes des dernières 36 heures (importance haute ou indice
//    de confiance élevé), deux au plus par zone ;
// 3. à défaut, l'ancienne sélection manuelle (lib/homeNews.ts).

export interface TickerItem {
  title: string;
  href: string | null;
}

const MAX_ITEMS = 12;
const PER_ZONE = 2;
const WINDOW_HOURS = 36;

interface BriefRow {
  id: number;
  zone_slug: string;
  title: string;
  importance: string | null;
  confidence: number | null;
  place_country: string | null;
  published_at: string;
}

/** « Pays — titre » : le pays en tête donne son drapeau au bandeau. */
function withCountry(title: string, country: string | null): string {
  if (!country || title.toLowerCase().startsWith(country.toLowerCase())) return title;
  return `${country} — ${title}`;
}

export function pickBriefs(rows: BriefRow[]): TickerItem[] {
  const strong = rows.filter((r) => r.importance === "high" || (r.confidence ?? 0) >= 70);
  const perZone = new Map<string, number>();
  const out: TickerItem[] = [];
  for (const r of strong) {
    const n = perZone.get(r.zone_slug) ?? 0;
    if (n >= PER_ZONE) continue;
    perZone.set(r.zone_slug, n + 1);
    out.push({ title: withCountry(r.title, r.place_country), href: `/briefs/${r.id}` });
  }
  return out;
}

export async function getTickerItems(): Promise<TickerItem[]> {
  const items: TickerItem[] = [];
  try {
    const { data } = await supabase
      .from("ticker_items")
      .select("text, href")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(6);
    for (const r of (data ?? []) as { text: string; href: string | null }[]) items.push({ title: r.text, href: r.href });
  } catch {
    // Table absente ou illisible : on continue avec les titres automatiques.
  }
  try {
    const since = new Date(Date.now() - WINDOW_HOURS * 3600_000).toISOString();
    const load = (columns: string) =>
      supabase.from("zone_briefs").select(columns).gte("published_at", since).order("published_at", { ascending: false }).limit(80);
    let { data, error } = await load("id, zone_slug, title, importance, confidence, place_country, published_at");
    // Colonnes des analystes V2 absentes : importance seule.
    if (error) ({ data, error } = await load("id, zone_slug, title, importance, published_at"));
    if (!error) {
      const seen = new Set(items.map((i) => i.title));
      for (const i of pickBriefs(((data ?? []) as Partial<BriefRow>[]).map((r) => ({ confidence: null, place_country: null, ...r }) as BriefRow))) {
        if (!seen.has(i.title)) items.push(i);
      }
    }
  } catch {
    // Supabase injoignable : repli plus bas.
  }
  if (!items.length) return HOME_NEWS.map((n) => ({ title: n.title, href: null }));
  return items.slice(0, MAX_ITEMS);
}
