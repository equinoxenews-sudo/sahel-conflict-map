import { mentionsAny, searchTermsOf } from "./countryTags";
import { ilikePattern } from "./search";
import { isSportsTitle } from "./sportsFilter";
import { supabase } from "./supabaseClient";

// Articles d'un pays pour le panneau du globe : ceux que l'analyste a étiquetés avec ce pays (colonne `countries`), plus ceux qui le
// nomment en entier dans leur titre ou leur résumé (rattrapage des articles publiés avant les tags, comme la recherche du site). Tous les
// articles comptent, qu'ils soient placés sur la carte ou non.

export const COUNTRY_ARTICLE_DAYS = 60;
const MAX_ARTICLES = 80;
const FETCH_LIMIT = 300;

export interface CountryArticle {
  id: number;
  title: string;
  publishedAt: string;
  imageUrl: string | null;
  /** Zone de l'article : sa photo de remplacement quand l'image de l'article manque ou ne se charge pas. */
  zone: string | null;
}

interface Row {
  id: number;
  title: string;
  summary: string | null;
  published_at: string;
  image_url: string | null;
  zone_slug: string | null;
  countries?: string[] | null;
}

const COLUMNS = "id, title, summary, published_at, image_url, zone_slug";

/** Une base lente ne doit pas bloquer le panneau : passé ce délai, la liste est vide (comme la recherche du site). */
const TIMEOUT_MS = 6000;

export function getCountryArticles(iso3: string, now = Date.now()): Promise<CountryArticle[]> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve([]), TIMEOUT_MS);
    loadCountryArticles(iso3, now).then(
      (articles) => {
        clearTimeout(timer);
        resolve(articles);
      },
      () => {
        clearTimeout(timer);
        resolve([]);
      },
    );
  });
}

async function loadCountryArticles(iso3: string, now: number): Promise<CountryArticle[]> {
  const terms = searchTermsOf(iso3);
  const since = new Date(now - COUNTRY_ARTICLE_DAYS * 86_400_000).toISOString();
  const rows = new Map<number, Row>();

  try {
    // Articles étiquetés : si la colonne n'existe pas encore, la requête échoue et on s'en tient au nom dans le texte.
    const tagged = await supabase.from("zone_briefs").select(COLUMNS).contains("countries", [iso3]).gte("published_at", since).order("published_at", { ascending: false }).limit(FETCH_LIMIT);
    if (!tagged.error) for (const row of (tagged.data ?? []) as Row[]) rows.set(row.id, row);

    // Nom du pays dans le titre ou le résumé : large côté base, puis filtré en mot entier (« Niger » n'est pas « Nigeria »).
    const patterns = terms.map((term) => ilikePattern(term)).filter((pattern) => pattern.length > 4);
    if (patterns.length > 0) {
      const text = await supabase
        .from("zone_briefs")
        .select(COLUMNS)
        .or(patterns.flatMap((pattern) => [`title.ilike.${pattern}`, `summary.ilike.${pattern}`]).join(","))
        .gte("published_at", since)
        .order("published_at", { ascending: false })
        .limit(FETCH_LIMIT);
      if (!text.error) {
        for (const row of (text.data ?? []) as Row[]) {
          if (!rows.has(row.id) && mentionsAny(`${row.title} ${row.summary ?? ""}`, terms)) rows.set(row.id, row);
        }
      }
    }
  } catch (error) {
    console.error("Articles du pays indisponibles :", error);
  }

  return [...rows.values()]
    .filter((row) => !isSportsTitle(row.title))
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at))
    .slice(0, MAX_ARTICLES)
    .map((row) => ({ id: row.id, title: row.title, publishedAt: row.published_at, imageUrl: row.image_url, zone: row.zone_slug }));
}
