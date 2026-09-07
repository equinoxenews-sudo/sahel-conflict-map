"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { LAC_TCHAD_CENTER, type LacTchadPoint } from "@/lib/lacTchad";
import mapStyles from "../Map.module.css";
import styles from "./LacTchadMap.module.css";

const KEYWORD_COLORS: Record<string, string> = {
  "Boko Haram": "#e53935",
  ISWAP: "#fb8c00",
  JAS: "#8e24aa",
};

function FitToPoints({ points }: { points: LacTchadPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const bounds: [number, number][] = points.map((p) => [p.lat, p.lon]);
    const id = requestAnimationFrame(() => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
    });
    return () => cancelAnimationFrame(id);
  }, [map, points]);

  return null;
}

interface LacTchadMapProps {
  points: LacTchadPoint[];
}

export default function LacTchadMap({ points }: LacTchadMapProps) {
  return (
    <div className={styles.container}>
      <MapContainer
        center={LAC_TCHAD_CENTER}
        zoom={7}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <FitToPoints points={points} />
        <TileLayer
          className={mapStyles.darkTiles}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((point) => {
          const color = KEYWORD_COLORS[point.keyword] ?? "#999999";
          return (
            <CircleMarker
              key={point.id}
              center={[point.lat, point.lon]}
              radius={7}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 1 }}
            >
              <Popup>
                <strong>{point.keyword}</strong>
                <br />
                {point.label}, {point.country}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      {points.length === 0 && (
        <div className={styles.emptyOverlay}>Aucun point pour les mots-clés sélectionnés</div>
      )}
    </div>
  );
}
