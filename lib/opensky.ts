const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
const STATES_URL = "https://opensky-network.org/api/states/all";

export interface OpenSkyResponse {
  time: number;
  states: (string | number | boolean | null)[][] | null;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

// Module-level cache: OpenSky tokens last 30 minutes, and a warm
// serverless instance handling several requests in that window can reuse
// one token instead of re-authenticating every call.
let cachedToken: CachedToken | null = null;

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenSky auth failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    // Refresh a bit early to avoid a request landing right on expiry.
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

/**
 * Fetches current aircraft states. Anonymous access exists but is heavily
 * rate-limited (~400 req/day) and, in practice, unreliable from Vercel's
 * shared serverless egress IPs — OAuth2 client-credentials auth (free
 * OpenSky account) gets a much higher, per-account quota instead of a
 * shared anonymous one. Falls back to an anonymous request only if no
 * credentials are configured.
 */
export async function fetchOpenSkyStates(): Promise<OpenSkyResponse> {
  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;

  const headers: Record<string, string> = {};
  if (clientId && clientSecret) {
    const token = await getAccessToken(clientId, clientSecret);
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(STATES_URL, { headers });
  if (!res.ok) {
    throw new Error(`OpenSky error: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as OpenSkyResponse;
}
