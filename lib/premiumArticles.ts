import { getSupabaseAdmin } from "./supabaseAdmin";
import { supabase } from "./supabaseClient";

// Articles premium de la rubrique Analyse : rédigés par les analystes du HQ, publiés
// par Nicolas depuis le HQ. La lecture publique ne voit que les articles publiés (RLS) ;
// un brouillon se lit côté serveur uniquement avec son jeton d'aperçu.

export interface PremiumArticle {
  id: number;
  zone_slug: string;
  title: string;
  summary: string | null;
  body_md: string;
  author_agent: string | null;
  author_name: string | null;
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

const LIST_COLUMNS = "id, zone_slug, title, summary, author_agent, author_name, status, created_at, updated_at, published_at";
const COLUMNS = `${LIST_COLUMNS}, body_md`;

export async function getPublishedArticles(zoneSlug: string, limit = 100): Promise<Omit<PremiumArticle, "body_md">[]> {
  try {
    const { data, error } = await supabase
      .from("premium_articles")
      .select(LIST_COLUMNS)
      .eq("zone_slug", zoneSlug)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) {
      // Table absente tant que supabase/add-premium-articles.sql n'a pas été exécuté.
      if (error.code !== "42P01" && error.code !== "PGRST205") console.error("Failed to load premium_articles:", error.message);
      return [];
    }
    return (data ?? []) as Omit<PremiumArticle, "body_md">[];
  } catch (err) {
    console.error("Failed to reach Supabase:", err);
    return [];
  }
}

export async function getPublishedArticle(zoneSlug: string, id: number): Promise<PremiumArticle | null> {
  try {
    const { data, error } = await supabase
      .from("premium_articles")
      .select(COLUMNS)
      .eq("id", id)
      .eq("zone_slug", zoneSlug)
      .eq("status", "published")
      .maybeSingle();
    if (error) return null;
    return (data as PremiumArticle | null) ?? null;
  } catch {
    return null;
  }
}

/** Aperçu (brouillon ou publié) : uniquement avec le jeton secret généré par le HQ. */
export async function getArticlePreview(zoneSlug: string, id: number, token: string): Promise<PremiumArticle | null> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("premium_articles")
      .select(COLUMNS)
      .eq("id", id)
      .eq("zone_slug", zoneSlug)
      .eq("preview_token", token)
      .maybeSingle();
    if (error) return null;
    return (data as PremiumArticle | null) ?? null;
  } catch {
    return null;
  }
}

/** Temps de lecture estimé (230 mots par minute). */
export function readingMinutes(markdown: string): number {
  const words = markdown.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}
