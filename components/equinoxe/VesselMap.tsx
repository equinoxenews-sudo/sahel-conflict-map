"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, Popup, TileLayer, CircleMarker } from "react-leaflet";
import { MARITIME_CHOKEPOINTS } from "@/lib/maritimeChokepoints";
import type { VesselPosition } from "@/types/vessel";
import styles from "./VesselMap.module.css";

interface VesselMapProps {
  vessels: VesselPosition[];
}

const WORLD_CENTER: [number, number] = [15, 30];

function regionName(slug: string): string {
  return MARITIME_CHOKEPOINTS.find((c) => c.slug === slug)?.name ?? slug;
}

function formatUpdatedAt(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function VesselMap({ vessels }: VesselMapProps) {
  const latest = vessels[0]?.updated_at;

  return (
    <div className={styles.container}>
      <MapContainer
        center={WORLD_CENTER}
        zoom={3}
        scrollWheelZoom
        preferCanvas
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          className={styles.darkTiles}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors — positions : <a href="https://aisstream.io">AISstream</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {vessels.map((v) => (
          <CircleMarker
            key={v.mmsi}
            center={[v.latitude, v.longitude]}
            radius={3}
            pathOptions={{ color: "#42a5f5", fillColor: "#42a5f5", fillOpacity: 0.85, weight: 1 }}
          >
            <Popup>
              <strong>{v.ship_name ?? `MMSI ${v.mmsi}`}</strong>
              <br />
              {regionName(v.region)}
              <br />
              Vitesse : {v.speed != null ? `${v.speed.toFixed(1)} nds` : "n/a"}
              <br />
              Cap : {v.course != null ? `${Math.round(v.course)}°` : "n/a"}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      <div className={styles.status}>
        {vessels.length} navire(s) suivi(s) près des points de passage stratégiques
        {latest ? ` · instantané du ${formatUpdatedAt(latest)}` : ""}
      </div>
    </div>
  );
}
