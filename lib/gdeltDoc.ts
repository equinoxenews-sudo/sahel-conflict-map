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

// GDELT DOC documents a hard "1 request per 5 seconds" limit. syncArticles
// queries all 5 zones concurrently (so one slow zone doesn't cost the
// others their share of the function's time budget), which without this
// queue fired all 5 requests in the same instant — instantly 429'ing 4 out
// of 5 zones every single run. This module-level queue serializes just the
// network call, spacing call *starts* at least 5.5s apart regardless of
// how many callers are queued up, while each caller's own downstream work
// (fetching descriptions, AI synthesis) still proceeds independently/
// concurrently once its call returns.
const MIN_CALL_INTERVAL_MS = 5500;
let queue: Promise<void> = Promise.resolve();
let lastCallStart = 0;

function scheduleCall<T>(fn: () => Promise<T>): Promise<T> {
  const turn = queue.then(async () => {
    const wait = Math.max(0, lastCallStart + MIN_CALL_INTERVAL_MS - Date.now());
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastCallStart = Date.now();
  });
  queue = turn;
  return turn.then(fn);
}

/**
 * Searches GDELT DOC 2.0 for recent articles matching any of `keywords`,
 * restricted to `domains`. GDELT DOC rejects overly long queries ("Your
 * query was too short or too long") — keep `domains` short (a handful of
 * sources), not a giant shared list.
 */
export async function searchArticles(
  keywords: string[],
  domains: string[],
  maxRecords = 10
): Promise<DocArticle[]> {
  const keywordClause = `(${keywords.map(quoteIfMultiWord).join(" OR ")})`;
  const domainClause = `(${domains.map((d) => `domain:${d}`).join(" OR ")})`;
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
  // small server that is sometimes slow or unresponsive. A single hung/
  // slow request must not be allowed to eat the whole function budget —
  // so this is a hard per-request timeout, and there's no retry-on-429: a
  // zone that gets rate-limited or times out is just skipped for today's
  // run and picked up tomorrow.
  //
  // The AbortController/timeout are created *inside* the scheduled
  // callback, not before it — callers may sit in scheduleCall's queue for
  // several seconds (multiple zones start at ~the same time), so a timer
  // started at call-time would often expire before the fetch even begins.
  // Started here, it only ever counts down against this call's own network
  // request.
  const res = await scheduleCall(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      return await fetch(`${DOC_API_URL}?${params.toString()}`, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  });
  if (!res.ok) {
    throw new Error(`GDELT DOC API error: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  let data: DocApiResponse;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`GDELT DOC API returned a non-JSON response: ${text.slice(0, 200)}`);
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
