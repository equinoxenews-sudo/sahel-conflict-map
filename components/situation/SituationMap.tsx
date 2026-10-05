"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { ZONE_APPROCHE_BOUNDS, ZONE_MAP_VIEWS } from "@/lib/zoneMapViews";
import styles from "./SituationMap.module.css";

export interface MapPoint {
  n: number;
  lat: number;
  lon: number;
  label: string;
}

interface SituationMapProps {
  points: MapPoint[];
  zoneSlug: string;
  selectedN?: number | null;
  onSelect?: (n: number) => void;
  /** Si fourni, un clic sur la carte renvoie ses coordonnées (relecture : placer un événement). */
  onMapClick?: (lat: number, lon: number) => void;
}

const IMAGERY_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const LABELS_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
const IMAGERY_CREDIT = "Esri, Maxar, Earthstar Geographics";
const PIN_SIZE = 24;
const PIN_SPREAD_PX = 26;

// Cadrage posé une fois le conteneur mesuré (même raison que components/Map.tsx).
// Sans point localisé, on retombe sur le cadrage de la zone.
function FitView({ points, zoneSlug }: { points: MapPoint[]; zoneSlug: string }) {
  const map = useMap();
  const signature = points.map((p) => `${p.lat},${p.lon}`).join("|");

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      map.invalidateSize();
      if (points.length > 0) {
        map.fitBounds(
          points.map((p) => [p.lat, p.lon] as [number, number]),
          { padding: [48, 48], maxZoom: 7, animate: false }
        );
        return;
      }
      const view = ZONE_MAP_VIEWS[zoneSlug];
      const frame = ZONE_APPROCHE_BOUNDS[zoneSlug];
      if (view) map.setView(view.center, view.zoom - 1, { animate: false });
      else if (frame) map.fitBounds(frame, { animate: false });
    });
    return () => cancelAnimationFrame(id);
    // `signature` résume `points` : on ne recadre que si les positions changent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, zoneSlug, signature]);

  return null;
}

function AutoResize() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function ClickCapture({ onMapClick }: { onMapClick?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click: (event) => onMapClick?.(event.latlng.lat, event.latlng.lng),
  });
  return null;
}

export default function SituationMap({ points, zoneSlug, selectedN = null, onSelect, onMapClick }: SituationMapProps) {
  // Plusieurs événements au même endroit (souvent la capitale) : pastilles
  // écartées côte à côte pour rester toutes lisibles.
  const offsets = useMemo(() => {
    const groups = new Map<string, MapPoint[]>();
    for (const point of points) {
      const key = `${point.lat.toFixed(2)},${point.lon.toFixed(2)}`;
      groups.set(key, [...(groups.get(key) ?? []), point]);
    }
    const result = new Map<number, number>();
    for (const group of groups.values()) {
      group.forEach((point, index) => result.set(point.n, (index - (group.length - 1) / 2) * PIN_SPREAD_PX));
    }
    return result;
  }, [points]);

  return (
    <MapContainer
      center={[0, 0]}
      zoom={3}
      scrollWheelZoom
      className={onMapClick ? `${styles.map} ${styles.placing}` : styles.map}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <AutoResize />
      <FitView points={points} zoneSlug={zoneSlug} />
      <ClickCapture onMapClick={onMapClick} />
      <TileLayer attribution={IMAGERY_CREDIT} url={IMAGERY_URL} maxNativeZoom={17} />
      <TileLayer url={LABELS_URL} maxNativeZoom={13} />
      {points.map((point) => (
        <Marker
          key={point.n}
          position={[point.lat, point.lon]}
          title={point.label}
          zIndexOffset={point.n === selectedN ? 1000 : 0}
          eventHandlers={{ click: () => onSelect?.(point.n) }}
          icon={L.divIcon({
            className: point.n === selectedN ? `${styles.pin} ${styles.pinSelected}` : styles.pin,
            html: String(point.n),
            iconSize: [PIN_SIZE, PIN_SIZE],
            iconAnchor: [PIN_SIZE / 2 - (offsets.get(point.n) ?? 0), PIN_SIZE / 2],
          })}
        />
      ))}
    </MapContainer>
  );
}
