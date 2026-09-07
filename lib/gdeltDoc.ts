import { NEWS_SOURCE_DOMAINS } from "./newsSources";

const DOC_API_URL = "https://api.gdeltproject.org/api/v2/doc/doc";

export interface DocArticle {
  url: string;
  title: string;
  seenDate: string; // YYYYMMDDTHHMMSSZ
  domain: string;
  language: string;
  sourceCountry: string;
}

interface DocApiResponse {
  articles?: {
    url: string;
    title: string;
    seendate: string;
    domain: string;
    language: string;
    sourcecountry: string;
  }[];
}

function quoteIfMultiWord(term: string): string {
  return term.includes(" ") ? `"${term}"` : term;
}

/**
 * Searches GDELT DOC 2.0 for recent articles matching any of `keywords`,
 * restricted to NEWS_SOURCE_DOMAINS. GDELT asks callers to space requests
 * at least 5s apart — this function makes exactly one request, callers
 * are responsible for pacing across multiple calls.
 */
export async function searchArticles(keywords: string[], maxRecords = 10): Promise<DocArticle[]> {
  const keywordClause = `(${keywords.map(quoteIfMultiWord).join(" OR ")})`;
  const domainClause = `(${NEWS_SOURCE_DOMAINS.map((d) => `domain:${d}`).join(" OR ")})`;
  const query = `${keywordClause} ${domainClause}`;

  const params = new URLSearchParams({
    query,
    mode: "artlist",
    format: "json",
    maxrecords: String(maxRecords),
    sort: "datedesc",
    timespan: "3days",
  });

  // api.gdeltproject.org (unlike the CDN-backed bulk export host) is a
  // small server that is sometimes slow or unresponsive. With 5 zones to
  // query in one ~60s function budget, a single hung/slow request must
  // not be allowed to eat the whole budget — so this is a hard per-request
  // timeout, and there's no retry-on-429: a zone that gets rate-limited or
  // times out is just skipped for today's run and picked up tomorrow.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  let res: Response;
  try {
    res = await fetch(`${DOC_API_URL}?${params.toString()}`, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
  if (!res.ok) {
    throw new Error(`GDELT DOC API error: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  let data: DocApiResponse;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`GDELT DOC API returned non-JSON (likely rate-limited): ${text.slice(0, 200)}`);
  }

  return (data.articles ?? []).map((a) => ({
    url: a.url,
    title: a.title,
    seenDate: a.seendate,
    domain: a.domain,
    language: a.language,
    sourceCountry: a.sourcecountry,
  }));
}
