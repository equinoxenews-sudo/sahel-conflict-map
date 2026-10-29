import { fetchArticleContent } from "./articleSummary";
import { mapWithConcurrency } from "./gdelt";

// Étape 3 du chantier Synthèses du jour : avant de déplacer la rédaction des lots vers
// GitHub Actions, vérifier que les pages d'articles s'y téléchargent aussi bien que sur
// Vercel (certains éditeurs bloquent davantage les adresses de GitHub). Lecture seule :
// aucun appel au modèle, aucune écriture en base. La route app/api/diagnostic/page-fetch
// lit l'échantillon côté Vercel, scripts/page-fetch-compare.ts relit les mêmes pages
// depuis GitHub Actions et compare.

/** Même parallélisme que la rédaction des synthèses (lib/syncBriefs.ts). */
export const PROBE_CONCURRENCY = 6;
export const MAX_PROBE_URLS = 120;

/** lu = texte ou résumé exploitable (même critère que la rédaction) ; vide = page lue sans texte ;
 *  refus = HTTP 4xx/5xx ; échec = délai dépassé ou réseau. */
export type ProbeOutcome = "lu" | "vide" | "refus" | "echec";

export interface ProbeResult {
  url: string;
  domain: string;
  outcome: ProbeOutcome;
  httpStatus: number | null;
  bodyLength: number;
  ms: number;
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function outcomeOf(httpStatus: number | null | undefined, text: string | null): ProbeOutcome {
  if (httpStatus == null) return "echec";
  if (httpStatus >= 400) return "refus";
  return text?.trim() ? "lu" : "vide";
}

export async function probePages(urls: string[]): Promise<ProbeResult[]> {
  return mapWithConcurrency(urls, PROBE_CONCURRENCY, async (url) => {
    const started = Date.now();
    const content = await fetchArticleContent(url);
    const text = content.bodyText?.trim() || content.summary?.trim() || null;
    return {
      url,
      domain: domainOf(url),
      outcome: outcomeOf(content.httpStatus, text),
      httpStatus: content.httpStatus ?? null,
      bodyLength: content.bodyText?.length ?? 0,
      ms: Date.now() - started,
    };
  });
}

export interface SideTotals {
  pages: number;
  lu: number;
  vide: number;
  refus: number;
  echec: number;
  /** Part des pages lues, en pourcentage arrondi à l'unité. */
  rate: number;
}

export interface DomainGap {
  domain: string;
  pages: number;
  vercel: number;
  github: number;
}

export interface ProbeComparison {
  vercel: SideTotals;
  github: SideTotals;
  /** Lues sur Vercel mais pas depuis GitHub : ce que le déménagement ferait perdre. */
  lostOnGithub: ProbeResult[];
  /** Lues depuis GitHub mais pas sur Vercel. */
  gainedOnGithub: ProbeResult[];
  /** Sites où le nombre de pages lues diffère, du plus grand écart au plus petit. */
  domainGaps: DomainGap[];
}

export function totals(results: ProbeResult[]): SideTotals {
  const count = (outcome: ProbeOutcome) => results.filter((r) => r.outcome === outcome).length;
  const lu = count("lu");
  return {
    pages: results.length,
    lu,
    vide: count("vide"),
    refus: count("refus"),
    echec: count("echec"),
    rate: results.length ? Math.round((lu / results.length) * 100) : 0,
  };
}

/** Compare les deux lectures sur les seules adresses présentes des deux côtés. */
export function compareProbes(vercel: ProbeResult[], github: ProbeResult[]): ProbeComparison {
  const githubByUrl = new Map(github.map((r) => [r.url, r]));
  const pairs = vercel.filter((r) => githubByUrl.has(r.url)).map((v) => [v, githubByUrl.get(v.url)!] as const);
  const v = pairs.map(([a]) => a);
  const g = pairs.map(([, b]) => b);

  const domains = new Map<string, DomainGap>();
  for (const [a, b] of pairs) {
    const gap = domains.get(a.domain) ?? { domain: a.domain, pages: 0, vercel: 0, github: 0 };
    gap.pages++;
    if (a.outcome === "lu") gap.vercel++;
    if (b.outcome === "lu") gap.github++;
    domains.set(a.domain, gap);
  }

  return {
    vercel: totals(v),
    github: totals(g),
    lostOnGithub: g.filter((b, i) => v[i].outcome === "lu" && b.outcome !== "lu"),
    gainedOnGithub: g.filter((b, i) => v[i].outcome !== "lu" && b.outcome === "lu"),
    domainGaps: [...domains.values()]
      .filter((d) => d.vercel !== d.github)
      .sort((a, b) => Math.abs(b.vercel - b.github) - Math.abs(a.vercel - a.github) || b.pages - a.pages),
  };
}
