const OAUTH_URL = "https://acleddata.com/oauth/token";
const ACLED_READ_URL = "https://acleddata.com/api/acled/read";
const PAGE_SIZE = 500;

export interface AcledEvent {
  event_id_cnty: string;
  event_date: string;
  event_type: string;
  country: string;
  latitude: string;
  longitude: string;
  fatalities: string;
  source: string;
  notes: string;
}

interface AcledReadResponse {
  success: boolean;
  data: AcledEvent[];
  next_cursor: string | number | null;
  error?: unknown;
}

interface AcledTokenResponse {
  access_token: string;
  expires_in: number;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

/**
 * ACLED moved from a static "API key" to a myACLED (email + password) OAuth
 * flow. We request a short-lived bearer token and reuse it for every page
 * of a sync run instead of re-authenticating per request.
 */
async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const email = process.env.ACLED_EMAIL;
  const password = process.env.ACLED_PASSWORD;

  if (!email || !password) {
    throw new Error("Missing ACLED_EMAIL or ACLED_PASSWORD environment variables.");
  }

  const body = new URLSearchParams({
    username: email,
    password,
    grant_type: "password",
    client_id: "acled",
    scope: "authenticated",
  });

  const res = await fetch(OAUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(
      `ACLED OAuth token request failed: ${res.status} ${res.statusText} — ${bodyText}`
    );
  }

  const json = (await res.json()) as AcledTokenResponse;

  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in - 60) * 1000, // renew a bit early
  };

  return cachedToken.value;
}

/**
 * Fetches every ACLED event for the given countries since `sinceDate`
 * (inclusive), using cursor-based pagination (ACLED's standard pagination
 * method as of October 2026 — see https://acleddata.com/api-documentation/).
 */
export async function fetchAcledEvents(
  countries: readonly string[],
  sinceDate: string
): Promise<AcledEvent[]> {
  const token = await getAccessToken();
  const results: AcledEvent[] = [];
  let cursor: string | number = 0;

  while (true) {
    const params = new URLSearchParams({
      _format: "json",
      country: countries.join("|"),
      event_date: sinceDate,
      event_date_where: ">=",
      limit: String(PAGE_SIZE),
      cursor: String(cursor),
    });

    const res = await fetch(`${ACLED_READ_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`ACLED API error: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as AcledReadResponse;

    if (!json.success) {
      throw new Error(`ACLED API returned an error: ${JSON.stringify(json.error)}`);
    }

    const batch = json.data ?? [];
    results.push(...batch);

    if (!json.next_cursor) break;
    cursor = json.next_cursor;
  }

  return results;
}
