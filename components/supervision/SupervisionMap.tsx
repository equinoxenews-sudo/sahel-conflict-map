"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { formatDate } from "@/lib/formatDate";
import type { Zone } from "@/lib/supervision/model";
import type { ResultItem } from "@/lib/supervision/results";

// Carte d'une veille : le cercle surveillé et les publications localisées. Chaque point dit d'où vient son lieu
// (source précise ou approximative) ; une publication sans lieu n'est pas dessinée (elle reste dans le flux). En mode
// « choix de zone », un clic place le centre du cercle.

const IMAGERY_CREDIT = "Esri, Maxar, Earthstar Geographics";
const WORLD_CENTER: [number, number] = [12, 10];
const COLORS: Record<string, string> = { gdelt: "#e87932", zone_brief: "#e0b44c", telegram: "#7fa3c7", rss: "#7fd6a0" };

function Resize() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function Frame({ zone, points }: { zone: Zone | null; points: [number, number][] }) {
  const map = useMap();
  const key = zone?.kind === "circle" ? `${zone.lat},${zone.lon},${zone.radiusKm}` : "none";
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      map.invalidateSize();
      if (zone?.kind === "circle") {
        map.fitBounds(L.circle([zone.lat, zone.lon], { radius: zone.radiusKm * 1000 }).getBounds(), { padding: [30, 30], animate: false });
      } else if (points.length > 0) {
        map.fitBounds(points, { padding: [50, 50], maxZoom: 6, animate: false });
      }
    });
    return () => cancelAnimationFrame(id);
    // Le cadrage ne suit que la zone choisie : un point ajouté ne doit pas faire sauter la carte sous les doigts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

function Picker({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({ click: (event) => onPick(Number(event.latlng.lat.toFixed(4)), Number(event.latlng.lng.toFixed(4))) });
  return null;
}

interface Props {
  zone: Zone | null;
  items?: ResultItem[];
  onPick?: (lat: number, lon: number) => void;
}

export default function SupervisionMap({ zone, items = [], onPick }: Props) {
  const located = useMemo(() => items.filter((item) => item.latitude != null && item.longitude != null), [items]);
  const points = useMemo(() => located.map((item) => [item.latitude!, item.longitude!] as [number, number]), [located]);

  return (
    <MapContainer center={WORLD_CENTER} zoom={3} scrollWheelZoom style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: onPick ? "crosshair" : undefined }}>
      <Resize />
      <Frame zone={zone} points={points} />
      {onPick ? <Picker onPick={onPick} /> : null}
      <TileLayer attribution={IMAGERY_CREDIT} url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={17} />
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={13} />
      {zone?.kind === "circle" ? (
        <Circle center={[zone.lat, zone.lon]} radius={zone.radiusKm * 1000} pathOptions={{ color: "#e0b44c", weight: 2, fillOpacity: 0.06, dashArray: "6 6" }} />
      ) : null}
      {located.map((item) => (
        <CircleMarker key={item.id} center={[item.latitude!, item.longitude!]} radius={7} pathOptions={{ color: "#0b1220", weight: 1.5, fillColor: COLORS[item.sourceKind] ?? "#e0b44c", fillOpacity: 0.95 }}>
          <Popup>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 260 }}>
              <span style={{ fontSize: 11, color: "#6b7788" }}>
                {item.publishedAt ? formatDate(item.publishedAt) : "Date inconnue"}
                {item.sourceName ? ` · ${item.sourceName}` : ""}
              </span>
              <a href={item.url} target={item.url.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer" style={{ fontWeight: 700 }}>
                {item.title}
              </a>
              <span style={{ fontSize: 11, color: "#6b7788" }}>
                {item.geoPlace ? `Lieu : ${item.geoPlace} · ` : ""}
                {item.geoPrecision === "exact" ? "position précise" : "position approximative"}
              </span>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
