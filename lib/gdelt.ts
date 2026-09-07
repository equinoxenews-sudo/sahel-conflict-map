import JSZip from "jszip";

const LAST_UPDATE_URL = "http://data.gdeltproject.org/gdeltv2/lastupdate.txt";

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

/**
 * Downloads and parses the latest GDELT 15-minute Event export (a single
 * file — this is a rolling/incremental feed, not a historical backfill).
 */
export async function fetchLatestGdeltEvents(): Promise<GdeltEvent[]> {
  const url = await getLatestExportUrl();

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
}
