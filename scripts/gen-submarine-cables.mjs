// Génère public/data/submarine-cables.geo.json à partir de la carte des câbles sous-marins de
// TeleGeography (https://www.submarinecablemap.com, données sous licence CC BY-SA 3.0 : la
// mention de la source est affichée sur le globe).
//
// Le fichier d'origine est allégé : on garde l'identifiant, le nom et la longueur approximative
// du câble, et les coordonnées sont arrondies à 0,01° (environ 1 km), largement assez pour un
// tracé à l'échelle du globe.
//
// Usage : node scripts/gen-submarine-cables.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE = "https://www.submarinecablemap.com/api/v3/cable/cable-geo.json";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "data", "submarine-cables.geo.json");

const round = (value) => Math.round(value * 100) / 100;

function haversineKm([lon1, lat1], [lon2, lat2]) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`Téléchargement impossible (${response.status})`);
const source = await response.json();

const features = [];
for (const feature of source.features ?? []) {
  const geometry = feature.geometry;
  if (!geometry || (geometry.type !== "MultiLineString" && geometry.type !== "LineString")) continue;
  const lines = geometry.type === "MultiLineString" ? geometry.coordinates : [geometry.coordinates];

  let km = 0;
  for (const line of lines) for (let i = 1; i < line.length; i++) km += haversineKm(line[i - 1], line[i]);

  // Points consécutifs identiques après arrondi : supprimés.
  const cleaned = lines
    .map((line) => {
      const out = [];
      for (const [lon, lat] of line) {
        const point = [round(lon), round(lat)];
        const last = out[out.length - 1];
        if (!last || last[0] !== point[0] || last[1] !== point[1]) out.push(point);
      }
      return out;
    })
    .filter((line) => line.length >= 2);
  if (cleaned.length === 0) continue;

  features.push({
    type: "Feature",
    properties: {
      id: String(feature.properties?.id ?? ""),
      name: String(feature.properties?.name ?? "Câble sans nom"),
      km: Math.round(km / 10) * 10,
    },
    geometry: { type: "MultiLineString", coordinates: cleaned },
  });
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ type: "FeatureCollection", features }));
console.log(`${features.length} câbles écrits dans ${OUT}`);
