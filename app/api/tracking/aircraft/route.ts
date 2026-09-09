import { NextResponse } from "next/server";
import { fetchOpenSkyStates } from "@/lib/opensky";

// A short edge cache means every visitor polling this route shares the
// same upstream call instead of each one spending its own quota.
const CACHE_SECONDS = 30;
// Rendering thousands of markers in Leaflet gets sluggish fast, and it's
// wasteful to ship the full ~9k-aircraft worldwide payload to the browser
// for a demo map — keep a representative but bounded slice.
const MAX_AIRCRAFT = 3000;

export async function GET() {
  try {
    const data = await fetchOpenSkyStates();
    const states = data.states ?? [];

    // Column order per OpenSky's REST API docs: icao24, callsign,
    // origin_country, time_position, last_contact, longitude, latitude,
    // baro_altitude, on_ground, velocity, true_track, ...
    const aircraft = states
      .map((s) => ({
        icao24: s[0] as string,
        callsign: typeof s[1] === "string" ? s[1].trim() || null : null,
        country: s[2] as string | null,
        longitude: s[5] as number | null,
        latitude: s[6] as number | null,
        altitude: s[7] as number | null,
        onGround: s[8] as boolean,
        velocity: s[9] as number | null,
        heading: s[10] as number | null,
      }))
      .filter((a) => a.latitude != null && a.longitude != null && !a.onGround)
      .slice(0, MAX_AIRCRAFT);

    return NextResponse.json(
      { aircraft, count: aircraft.length, time: data.time },
      { headers: { "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60` } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
