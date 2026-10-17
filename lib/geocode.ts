import { findCapitalByLabel } from "./countries";
import { getSupabaseAdmin } from "./supabaseAdmin";

// Position d'une synthèse sur la carte d'actualités : la ville citée par
// l'analyste, sinon la capitale du pays concerné (information d'ordre national).
// Service gratuit OpenStreetMap Nominatim, dans le respect de ses règles d'usage :
// une requête par seconde au plus, identification de l'application, et cache
// (table geocode_cache) pour ne jamais redemander un même lieu.

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "EquinoxeNews/1.0 (+https://sahel-conflict-map.vercel.app)";

export interface GeoPoint {
  placeName: string;
  country: string;
  latitude: number;
  longitude: number;
  precision: "ville" | "capitale";
}

let lastCall = 0;

async function nominatim(query: string): Promise<{ lat: number; lon: number; label: string } | null> {
  const db = getSupabaseAdmin();
  const key = query.toLowerCase().trim();
  const { data: cached } = await db.from("geocode_cache").select("latitude, longitude, label").eq("query", key).maybeSingle();
  if (cached) return cached.latitude == null ? null : { lat: cached.latitude, lon: cached.longitude, label: cached.label ?? query };

  const wait = 1100 - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  try {
    const url = `${NOMINATIM}?format=jsonv2&limit=1&accept-language=fr&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, cache: "no-store" });
    if (!res.ok) return null; // erreur passagère : pas de mise en cache
    const hits = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    const hit = hits[0] ? { lat: Number(hits[0].lat), lon: Number(hits[0].lon), label: hits[0].display_name } : null;
    // Un lieu introuvable est aussi mis en cache, pour ne pas le redemander chaque jour.
    await db.from("geocode_cache").upsert({ query: key, latitude: hit?.lat ?? null, longitude: hit?.lon ?? null, label: hit?.label ?? null });
    return hit;
  } catch {
    return null;
  }
}

/**
 * Place une synthèse : ville si elle est donnée et trouvée, sinon capitale du pays.
 * null si le pays n'est pas identifiable : la synthèse reste publiée, hors carte.
 */
export async function locateBrief(city: string | null, country: string | null): Promise<GeoPoint | null> {
  if (!country?.trim()) return null;
  const countryName = country.trim();
  if (city?.trim()) {
    const hit = await nominatim(`${city.trim()}, ${countryName}`);
    if (hit) return { placeName: city.trim(), country: countryName, latitude: hit.lat, longitude: hit.lon, precision: "ville" };
  }
  const capital = findCapitalByLabel(countryName);
  const capitalName = capital?.capital ?? null;
  if (!capitalName) return null;
  const hit = await nominatim(`${capitalName}, ${capital?.country ?? countryName}`);
  return hit ? { placeName: capitalName, country: capital?.country ?? countryName, latitude: hit.lat, longitude: hit.lon, precision: "capitale" } : null;
}
