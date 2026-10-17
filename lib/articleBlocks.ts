// Blocs enrichis des articles premium, écrits par les analystes dans le Markdown :
//   ```graphique {"type":"barres"|"courbe","titre","unite","source","donnees":[["libellé", 12], …]} ```
//   ```carte {"titre","points":[{"lieu","lat","lon","date","fait","confiance","precision"}, …]} ```
// Validation stricte : un bloc invalide est affiché tel quel (code), jamais à moitié.

export interface ChartSpec {
  type: "barres" | "courbe";
  titre: string;
  unite: string | null;
  source: string | null;
  donnees: [string, number][];
}

export interface MapPoint {
  lieu: string;
  lat: number;
  lon: number;
  date: string | null;
  fait: string | null;
  confiance: string | null;
  precision: string | null;
}

export interface MapSpec {
  titre: string | null;
  points: MapPoint[];
}

function text(value: unknown, max = 600): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function json(source: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(source);
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function parseChart(source: string): ChartSpec | null {
  const raw = json(source);
  if (!raw || !Array.isArray(raw.donnees)) return null;
  const donnees = raw.donnees
    .filter((d): d is [unknown, unknown] => Array.isArray(d) && d.length >= 2)
    .map(([label, value]) => [text(label, 80), typeof value === "number" ? value : Number(value)] as const)
    .filter((d): d is readonly [string, number] => d[0] !== null && Number.isFinite(d[1]))
    .slice(0, 40)
    .map(([label, value]) => [label, value] as [string, number]);
  const titre = text(raw.titre, 200);
  if (!titre || donnees.length === 0) return null;
  return {
    type: raw.type === "courbe" ? "courbe" : "barres",
    titre,
    unite: text(raw.unite, 60),
    source: text(raw.source),
    donnees,
  };
}

export function parseMap(source: string): MapSpec | null {
  const raw = json(source);
  if (!raw || !Array.isArray(raw.points)) return null;
  const points: MapPoint[] = [];
  for (const p of raw.points.slice(0, 200)) {
    if (!p || typeof p !== "object") continue;
    const r = p as Record<string, unknown>;
    const lat = Number(r.lat);
    const lon = Number(r.lon);
    const lieu = text(r.lieu, 200);
    if (!lieu || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    points.push({ lieu, lat, lon, date: text(r.date, 40), fait: text(r.fait), confiance: text(r.confiance, 40), precision: text(r.precision, 300) });
  }
  if (points.length === 0) return null;
  return { titre: text(raw.titre, 200), points };
}

/** Image Markdown seule sur sa ligne : ![légende](https://…). Seul le https est accepté. */
export function parseImage(line: string): { alt: string; src: string } | null {
  const m = /^!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)$/.exec(line.trim());
  return m ? { alt: m[1].trim(), src: m[2] } : null;
}
