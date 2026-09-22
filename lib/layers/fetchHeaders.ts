// Shared across every live-data layer fetcher (aircraft, satellites,
// earthquakes, naturalEvents, launches). None of these public APIs
// require a key, but several (adsb.lol, CelesTrak in particular) are
// known to rate-limit or reject requests that look like generic/bot
// traffic — a real User-Agent is cheap insurance, and already the
// pattern lib/articleSummary.ts uses successfully for source scraping.
export const LAYER_FETCH_HEADERS = {
  Connection: "close",
  "User-Agent": "Mozilla/5.0 (compatible; EquinoxeNewsBot/1.0; +https://sahel-conflict-map.vercel.app)",
} as const;
