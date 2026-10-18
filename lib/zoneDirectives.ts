import { getSupabaseAdmin } from "./supabaseAdmin";

// Consigne du jour d'une zone, saisie par Nicolas dans ÉQUINOXE HQ (« priorité aux
// émeutes en France »). Elle oriente la rédaction automatique des analystes : les
// sources qui en parlent passent en premier et le modèle reçoit la consigne. Aucun
// appel supplémentaire : quelques lignes de plus dans un appel qui a lieu de toute façon.

export interface ZoneDirective {
  text: string;
  activeUntil: string;
}

/** Consigne active de la zone, ou null (table absente, aucune consigne, lecture impossible). */
export async function activeDirective(zoneSlug: string): Promise<ZoneDirective | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("zone_directives")
      .select("text, active_until")
      .eq("zone_slug", zoneSlug)
      .gt("active_until", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);
    if (error || !data?.length) return null;
    return { text: String(data[0].text), activeUntil: String(data[0].active_until) };
  } catch {
    return null;
  }
}

const STOPWORDS = new Set(
  "alors aussi avant avec avoir besoin bien cela celle celles ceux cette chaque comme dans depuis donc elle elles entre faire faut fasse fasses leur leurs mais mettre meme même moins notre nous particuliere particulière pendant peut plus pour quand quelle quelles quels sans selon sera sont sous surtout toute toutes tous tout tres très une vers votre vous aujourd hui attention priorite priorité sujet suivre suivi zone".split(" "),
);

function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Mots-clés significatifs de la consigne (5 lettres et plus, hors mots courants). */
export function directiveKeywords(text: string): string[] {
  const words = fold(text).match(/[a-z0-9'-]{5,}/g) ?? [];
  return [...new Set(words.map((w) => w.replace(/^[a-z]'/, "")).filter((w) => w.length >= 5 && !STOPWORDS.has(w)))].slice(0, 20);
}

/** Vrai si le texte évoque la consigne (un mot-clé suffit, racine de 5 lettres). */
export function matchesDirective(text: string, keywords: string[]): boolean {
  if (!keywords.length) return false;
  const t = fold(text);
  return keywords.some((k) => t.includes(k.slice(0, Math.max(5, k.length - 2))));
}

/** Classe des éléments : ceux qui évoquent la consigne d'abord, l'ordre est conservé sinon. */
export function prioritize<T>(items: T[], textOf: (item: T) => string, keywords: string[]): T[] {
  if (!keywords.length) return items;
  const hit = items.filter((i) => matchesDirective(textOf(i), keywords));
  return [...hit, ...items.filter((i) => !hit.includes(i))];
}

/** Bloc ajouté aux consignes du modèle. */
export function directivePrompt(d: ZoneDirective | null): string {
  if (!d) return "";
  return `

CONSIGNE DU RÉDACTEUR EN CHEF POUR CETTE ZONE (prioritaire, en vigueur jusqu'au ${d.activeUntil.slice(0, 10)}) :
« ${d.text} »
Traite ce sujet en priorité s'il apparaît dans les sources : une synthèse complète et précise (lieux, bilans, dégâts, acteurs, chronologie), sans rien inventer. Les autres règles restent inchangées : ne crée pas d'article sur ce sujet si les sources fournies n'en parlent pas.`;
}
