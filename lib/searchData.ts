// Recherche dans le contenu publié (Supabase, lecture publique) : synthèses et articles de presse (« Actualités »),
// points de situation et analyses premium (« Analyses »). Chaque source échoue seule : un tableau vide, jamais d'erreur.
import { clampQuery, ilikePattern, MIN_QUERY_LENGTH, queryTokens, type SearchKind, type SearchResult } from "./search";
import { searchCountries, searchEntities } from "./searchIndex";
import { isSportsTitle } from "./sportsFilter";
import { supabase } from "./supabaseClient";
import { getZone } from "./zones";

const PER_SOURCE = 8;
/** Une base lente ne doit pas bloquer la réponse : passé ce délai, la source est ignorée (les pays et entités répondent déjà). */
const SOURCE_TIMEOUT_MS = 5000;

function withTimeout(promise: Promise<SearchResult[]>): Promise<SearchResult[]> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve([]), SOURCE_TIMEOUT_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve([]);
      }
    );
  });
}

function zoneName(slug: string): string {
  return getZone(slug)?.name ?? slug;
}

function shortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" });
}

function joinDetail(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(" · ");
}

/** Plusieurs mots : la recherche porte sur la phrase entière, ce qui garde les résultats précis. */
function pattern(query: string): string {
  return ilikePattern(query);
}

async function searchBriefs(query: string): Promise<SearchResult[]> {
  try {
    const like = pattern(query);
    const { data, error } = await supabase
      .from("zone_briefs")
      .select("id, zone_slug, title, summary, published_at")
      .or(`title.ilike.${like},summary.ilike.${like}`)
      .order("published_at", { ascending: false })
      .limit(PER_SOURCE * 2);
    if (error) return [];
    return ((data ?? []) as { id: number; zone_slug: string; title: string; published_at: string | null }[])
      .filter((row) => !isSportsTitle(row.title))
      .slice(0, PER_SOURCE)
      .map((row) => ({
        kind: "actualites" as const,
        label: "Synthèse",
        title: row.title,
        detail: joinDetail([zoneName(row.zone_slug), shortDate(row.published_at)]),
        href: `/briefs/${row.id}`,
        date: row.published_at ?? undefined,
      }));
  } catch {
    return [];
  }
}

async function searchArticles(query: string): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabase
      .from("articles")
      .select("zone_slug, title, url, domain, published_at")
      .ilike("title", pattern(query))
      .order("published_at", { ascending: false })
      .limit(PER_SOURCE * 2);
    if (error) return [];
    return ((data ?? []) as { zone_slug: string; title: string; url: string; domain: string | null; published_at: string | null }[])
      .filter((row) => !isSportsTitle(row.title) && /^https?:\/\//.test(row.url))
      .slice(0, PER_SOURCE)
      .map((row) => ({
        kind: "actualites" as const,
        label: "Article de presse",
        title: row.title,
        detail: joinDetail([row.domain, zoneName(row.zone_slug), shortDate(row.published_at)]),
        href: row.url,
        external: true,
        date: row.published_at ?? undefined,
      }));
  } catch {
    return [];
  }
}

async function searchSituationReports(query: string): Promise<SearchResult[]> {
  try {
    const like = pattern(query);
    const { data, error } = await supabase
      .from("situation_reports")
      .select("id, zone_slug, title, period_end")
      .eq("status", "published")
      .or(`title.ilike.${like},conclusion.ilike.${like}`)
      .order("period_end", { ascending: false })
      .limit(PER_SOURCE);
    if (error) return [];
    return ((data ?? []) as { id: number; zone_slug: string; title: string; period_end: string }[]).map((row) => ({
      kind: "analyses" as const,
      label: "Point de situation",
      title: row.title,
      detail: joinDetail([zoneName(row.zone_slug), shortDate(row.period_end)]),
      href: `/zones/${row.zone_slug}/analyse/point-de-situation/${row.id}`,
      date: row.period_end,
    }));
  } catch {
    return [];
  }
}

async function searchPremium(query: string): Promise<SearchResult[]> {
  try {
    const like = pattern(query);
    const { data, error } = await supabase
      .from("premium_articles")
      .select("id, zone_slug, title, published_at")
      .eq("status", "published")
      .or(`title.ilike.${like},summary.ilike.${like}`)
      .order("published_at", { ascending: false })
      .limit(PER_SOURCE);
    if (error) return [];
    return ((data ?? []) as { id: number; zone_slug: string; title: string; published_at: string | null }[]).map((row) => ({
      kind: "analyses" as const,
      label: "Analyse",
      title: row.title,
      detail: joinDetail([zoneName(row.zone_slug), shortDate(row.published_at)]),
      href: `/zones/${row.zone_slug}/analyse/premium/${row.id}`,
      date: row.published_at ?? undefined,
    }));
  } catch {
    return [];
  }
}

/** Les plus récents d'abord, tous types de contenus datés confondus. */
function byDateDesc(a: SearchResult, b: SearchResult): number {
  return (b.date ?? "").localeCompare(a.date ?? "");
}

/** Recherche globale. `kind` restreint à une catégorie (les autres ne sont alors pas interrogées). */
export async function globalSearch(rawQuery: string, kind?: SearchKind): Promise<SearchResult[]> {
  const query = clampQuery(rawQuery);
  if (query.length < MIN_QUERY_LENGTH || queryTokens(query).length === 0) return [];
  const wants = (candidate: SearchKind) => !kind || kind === candidate;

  const [briefs, articles, reports, premium] = await Promise.all([
    wants("actualites") ? withTimeout(searchBriefs(query)) : [],
    wants("actualites") ? withTimeout(searchArticles(query)) : [],
    wants("analyses") ? withTimeout(searchSituationReports(query)) : [],
    wants("analyses") ? withTimeout(searchPremium(query)) : [],
  ]);

  return [
    ...(wants("pays") ? searchCountries(query) : []),
    ...(wants("actualites") ? [...briefs, ...articles].sort(byDateDesc).slice(0, PER_SOURCE) : []),
    ...(wants("analyses") ? [...premium, ...reports].sort(byDateDesc).slice(0, PER_SOURCE) : []),
    ...(wants("entites") ? searchEntities(query) : []),
  ];
}
