import WebSocket from "ws";
import { MARITIME_CHOKEPOINTS } from "./maritimeChokepoints";
import { getSupabaseAdmin } from "./supabaseAdmin";

const AISSTREAM_URL = "wss://stream.aisstream.io/v0/stream";
// AISstream is WebSocket-only with a hard "3 connections per account/IP"
// limit and no SLA — not something to hold open indefinitely from a
// serverless function. A brief connection that collects whatever position
// reports arrive in this window, then disconnects, is the model that fits
// both that constraint and Vercel's request-scoped execution.
const LISTEN_DURATION_MS = 20000;

interface VesselRow {
  mmsi: string;
  ship_name: string | null;
  latitude: number;
  longitude: number;
  speed: number | null;
  course: number | null;
  region: string;
  updated_at: string;
}

function regionFor(lat: number, lon: number): string | null {
  const hit = MARITIME_CHOKEPOINTS.find(
    ({ boundingBox: [[swLat, swLon], [neLat, neLon]] }) =>
      lat >= swLat && lat <= neLat && lon >= swLon && lon <= neLon
  );
  return hit?.slug ?? null;
}

interface AisStreamMessage {
  MessageType?: string;
  MetaData?: { MMSI?: number; ShipName?: string; Latitude?: number; Longitude?: number };
  Message?: { PositionReport?: { Sog?: number; Cog?: number } };
}

async function collectPositions(apiKey: string): Promise<Map<string, VesselRow>> {
  const vessels = new Map<string, VesselRow>();

  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(AISSTREAM_URL);
    const timeoutId = setTimeout(() => ws.close(), LISTEN_DURATION_MS);

    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          APIKey: apiKey,
          BoundingBoxes: MARITIME_CHOKEPOINTS.map((c) => c.boundingBox),
          FilterMessageTypes: ["PositionReport"],
        })
      );
    });

    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString()) as AisStreamMessage;
        if (data.MessageType !== "PositionReport") return;

        const meta = data.MetaData;
        if (!meta || typeof meta.Latitude !== "number" || typeof meta.Longitude !== "number") return;
        if (meta.MMSI == null) return;

        const region = regionFor(meta.Latitude, meta.Longitude);
        if (!region) return;

        const report = data.Message?.PositionReport;
        vessels.set(String(meta.MMSI), {
          mmsi: String(meta.MMSI),
          ship_name: typeof meta.ShipName === "string" ? meta.ShipName.trim() || null : null,
          latitude: meta.Latitude,
          longitude: meta.Longitude,
          speed: typeof report?.Sog === "number" ? report.Sog : null,
          course: typeof report?.Cog === "number" ? report.Cog : null,
          region,
          updated_at: new Date().toISOString(),
        });
      } catch {
        // Ignore a single malformed message — the stream keeps flowing.
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });

    ws.on("close", () => {
      clearTimeout(timeoutId);
      resolve();
    });
  });

  return vessels;
}

/**
 * Connects briefly to AISstream, collects position reports near a
 * curated list of maritime chokepoints (lib/maritimeChokepoints.ts), and
 * upserts a snapshot into Supabase. Not a live feed — see the module
 * comment on LISTEN_DURATION_MS for why. A day with too little shipping
 * activity in the listen window, or AISstream being unreachable, just
 * means fewer/no rows updated; existing rows from a previous run are left
 * as-is rather than cleared.
 */
export async function syncVessels(): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const apiKey = process.env.AISSTREAM_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "AISSTREAM_API_KEY not configured" };
  }

  const vessels = await collectPositions(apiKey);
  if (vessels.size === 0) {
    return { ok: true, count: 0 };
  }

  const supabase = getSupabaseAdmin();
  const rows = Array.from(vessels.values());
  const { error } = await supabase.from("vessel_positions").upsert(rows, { onConflict: "mmsi" });

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }

  return { ok: true, count: rows.length };
}
