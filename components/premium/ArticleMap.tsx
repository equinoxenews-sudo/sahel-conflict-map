"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { MapPoint } from "@/lib/articleBlocks";
import { confidenceColor } from "@/lib/confidence";
import styles from "./ArticleBlocks.module.css";

// Carte des incidents d'un article premium : même fond satellite que la carte
// d'actualités, un point par incident, coloré selon l'indice de confiance.

function Fit({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      map.invalidateSize();
      if (points.length === 1) map.setView(points[0], 8, { animate: false });
      else map.fitBounds(points, { padding: [40, 40], maxZoom: 9, animate: false });
    });
    return () => cancelAnimationFrame(id);
  }, [map, points]);
  return null;
}

export default function ArticleMap({ points }: { points: MapPoint[] }) {
  const positions = points.map((p) => [p.lat, p.lon] as [number, number]);
  return (
    <MapContainer center={positions[0]} zoom={7} scrollWheelZoom={false} className={styles.mapCanvas}>
      <Fit points={positions} />
      <TileLayer
        attribution="Esri, Maxar, Earthstar Geographics"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxNativeZoom={17}
      />
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
        maxNativeZoom={13}
      />
      {points.map((p, i) => (
        <CircleMarker
          key={i}
          center={[p.lat, p.lon]}
          radius={11}
          pathOptions={{ color: "#ffffff", weight: 2, fillColor: confidenceColor(p.confiance), fillOpacity: 0.95 }}
        >
          <Tooltip permanent direction="center" className={styles.mapNumber}>
            {i + 1}
          </Tooltip>
          <Popup>
            <div className={styles.popup}>
              <b>
                {i + 1}. {p.lieu}
              </b>
              {p.date && <span>{p.date}</span>}
              {p.fait && <span>{p.fait}</span>}
              {p.confiance && <span>Confiance : {p.confiance}</span>}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
