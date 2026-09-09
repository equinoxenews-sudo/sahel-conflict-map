import JSZip from "jszip";

const LAST_UPDATE_URL = "http://data.gdeltproject.org/gdeltv2/lastupdate.txt";
const GDELT_BASE_URL = "http://data.gdeltproject.org/gdeltv2";

// GDELT publishes a new 15-minute Event export at :00/:15/:30/:45. On a
// Vercel Hobby plan the sync cron can only run once a day, so a single
// 15-minute file per run would cover a negligible sliver of the day.
// Instead each run walks back this many hours (in 15-min steps) from the
// latest available file. This still leaves a real daily coverage gap
// (events outside this window are never ingested) — a Pro plan cron
// running hourly would close it, but that's a paid-plan tradeoff.
const LOOKBACK_HOURS = 6;
const FILES_PER_RUN = LOOKBACK_HOURS * 4;
const FETCH_CONCURRENCY = 8;

// 0-indexed column positions in the GDELT 2.0 Event export, per the
// official codebook (http://data.gdeltproject.org/documentation/
// GDELT-Event_Codebook-V2.0.pdf), verified against a live sample file.
const COL = {
  EVENT_ROOT_CODE: 28,
  GOLDSTEIN_SCALE: 30,
  NUM_MENTIONS: 31,
  AVG_TONE: 34,
  ACTION_GEO_COUNTRY_CODE: 53,
  ACTION_GEO_LAT: 56,
  ACTION_GEO_LONG: 57,
  DATE_ADDED: 59,
  SOURCE_URL: 60,
} as const;

export interface GdeltEvent {
  globalEventId: string;
  dateAdded: string; // YYYYMMDDHHMMSS
  eventRootCode: string;
  goldsteinScale: number;
  numMentions: number;
  avgTone: number;
  actionGeoCountryCode: string;
  lat: number;
  lon: number;
  sourceUrl: string;
}

/**
 * Finds the latest 15-minute Event export URL by reading GDELT's
 * lastupdate.txt pointer file (3 lines: export / mentions / gkg).
 */
async function getLatestExportUrl(): Promise<string> {
  const res = await fetch(LAST_UPDATE_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch GDELT lastupdate.txt: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  const exportLine = text.split("\n").find((line) => line.includes(".export.CSV.zip"));
  if (!exportLine) {
    throw new Error("Could not find an .export.CSV.zip entry in GDELT lastupdate.txt");
  }
  const url = exportLine.trim().split(/\s+/).pop();
  if (!url) {
    throw new Error("Could not parse export URL from GDELT lastupdate.txt");
  }
  return url;
}

/** Extracts the YYYYMMDDHHMMSS timestamp from a GDELT export filename/URL. */
function extractTimestamp(url: string): string {
  const match = url.match(/(\d{14})\.export\.CSV\.zip$/);
  if (!match) {
    throw new Error(`Could not extract a timestamp from GDELT URL: ${url}`);
  }
  return match[1];
}

function timestampToDate(ts: string): Date {
  const y = Number(ts.slice(0, 4));
  const mo = Number(ts.slice(4, 6)) - 1;
  const d = Number(ts.slice(6, 8));
  const h = Number(ts.slice(8, 10));
  const mi = Number(ts.slice(10, 12));
  const s = Number(ts.slice(12, 14));
  return new Date(Date.UTC(y, mo, d, h, mi, s));
}

function dateToTimestamp(date: Date): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
  );
}

function parseRow(fields: string[]): GdeltEvent | null {
  const lat = Number(fields[COL.ACTION_GEO_LAT]);
  const lon = Number(fields[COL.ACTION_GEO_LONG]);
  if (!fields[0] || Number.isNaN(lat) || Number.isNaN(lon)) return null;

  return {
    globalEventId: fields[0],
    dateAdded: fields[COL.DATE_ADDED],
    eventRootCode: fields[COL.EVENT_ROOT_CODE],
    goldsteinScale: Number(fields[COL.GOLDSTEIN_SCALE]) || 0,
    numMentions: Number(fields[COL.NUM_MENTIONS]) || 0,
    avgTone: Number(fields[COL.AVG_TONE]) || 0,
    actionGeoCountryCode: fields[COL.ACTION_GEO_COUNTRY_CODE] || "",
    lat,
    lon,
    sourceUrl: fields[COL.SOURCE_URL] || "",
  };
}

const RETRY_DELAYS_MS = [500, 1500];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Downloads one 15-minute export .zip and parses its events. GDELT's bulk
 * export is a static-file CDN (unlike its DOC search API), so failures
 * here are expected to be rare transient blips rather than systemic
 * unreliability — a couple of quick retries covers that without masking
 * a genuinely broken URL (which will still fail after retries and get
 * skipped by the caller, same as before).
 */
async function fetchAndParseExport(url: string): Promise<GdeltEvent[]> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to download GDELT export (${url}): ${res.status} ${res.statusText}`);
      }
      const buffer = await res.arrayBuffer();

      const zip = await JSZip.loadAsync(buffer);
      const csvFile = Object.values(zip.files).find((f) => f.name.endsWith(".CSV"));
      if (!csvFile) {
        throw new Error("GDELT export zip did not contain a .CSV file");
      }
      const csvText = await csvFile.async("text");

      const events: GdeltEvent[] = [];
      for (const line of csvText.split("\n")) {
        if (!line) continue;
        const fields = line.split("\t");
        const event = parseRow(fields);
        if (event) events.push(event);
      }
      return events;
    } catch (err) {
      lastError = err;
      if (attempt < RETRY_DELAYS_MS.length) {
        await delay(RETRY_DELAYS_MS[attempt]);
      }
    }
  }

  throw lastError;
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Downloads and parses the last ~LOOKBACK_HOURS of GDELT 15-minute Event
 * exports. Files that fail to download or parse are skipped (logged, not
 * fatal) rather than failing the whole sync — GDELT occasionally has gaps
 * or slow-to-publish files.
 */
export async function fetchLatestGdeltEvents(): Promise<GdeltEvent[]> {
  const latestUrl = await getLatestExportUrl();
  const latestTimestamp = extractTimestamp(latestUrl);
  const latestDate = timestampToDate(latestTimestamp);

  const urls: string[] = [];
  for (let i = 0; i < FILES_PER_RUN; i++) {
    const d = new Date(latestDate.getTime() - i * 15 * 60 * 1000);
    const ts = dateToTimestamp(d);
    urls.push(`${GDELT_BASE_URL}/${ts}.export.CSV.zip`);
  }

  const batches = await mapWithConcurrency(urls, FETCH_CONCURRENCY, async (url) => {
    try {
      return await fetchAndParseExport(url);
    } catch (err) {
      console.error(`Skipping GDELT file ${url}:`, err);
      return [] as GdeltEvent[];
    }
  });

  return batches.flat();
}
