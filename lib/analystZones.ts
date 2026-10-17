/**
 * Zones passées au fonctionnement « analyste » (V2) : indice de confiance,
 * géolocalisation des synthèses, Telegram en source complémentaire et carte
 * d'actualités alimentée par les synthèses. Mise en service zone par zone,
 * sur décision de Nicolas : variable ANALYST_V2_ZONES (« afrique,europe… »),
 * Afrique seule par défaut.
 */
const DEFAULT_ZONES = ["afrique"];

export function analystV2Zones(env: Record<string, string | undefined> = process.env): string[] {
  const raw = env.ANALYST_V2_ZONES?.trim();
  if (!raw) return DEFAULT_ZONES;
  return raw.split(",").map((z) => z.trim()).filter(Boolean);
}

export function isAnalystV2Zone(zoneSlug: string): boolean {
  return analystV2Zones().includes(zoneSlug);
}
