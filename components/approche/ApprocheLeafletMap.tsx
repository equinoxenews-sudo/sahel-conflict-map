"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { MapLayer, MapModule } from "@/lib/approche/modules";
import styles from "./Approche.module.css";

// Fond sombre d'Esri : lisible sous des points colorés (le satellite des fiches pays masquerait les couches).
const TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const TILE_CREDIT = "Esri, HERE, Garmin, © OpenStreetMap contributors";

interface Props {
  layers: MapLayer[];
  view: MapModule["view"];
  /** « couche:objet » de l'objet sélectionné. */
  selected: string | null;
  resetToken: number;
  onSelect: (layerId: string, featureId: string) => void;
}

// Même correction que components/Map.tsx : la carte se redimensionne avec son conteneur.
function AutoResize() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

/** Revient à la vue de départ à chaque demande de réinitialisation. */
function ResetView({ view, token }: { view: Props["view"]; token: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([view.lat, view.lon], view.zoom);
  }, [map, view.lat, view.lon, view.zoom, token]);
  return null;
}

/** Centre la carte sur l'objet sélectionné (depuis la carte ou depuis une liste). */
function FlyToSelection({ layers, selected }: { layers: MapLayer[]; selected: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!selected) return;
    const [layerId, featureId] = selected.split(":");
    const feature = layers.find((layer) => layer.id === layerId)?.features.find((item) => item.id === featureId);
    if (feature) map.flyTo([feature.lat, feature.lon], Math.max(map.getZoom(), 4), { duration: 0.6 });
  }, [map, layers, selected]);
  return null;
}

export default function ApprocheLeafletMap({ layers, view, selected, resetToken, onSelect }: Props) {
  return (
    <MapContainer center={[view.lat, view.lon]} zoom={view.zoom} minZoom={2} scrollWheelZoom worldCopyJump className={styles.leaflet} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <AutoResize />
      <ResetView view={view} token={resetToken} />
      <FlyToSelection layers={layers} selected={selected} />
      <TileLayer attribution={TILE_CREDIT} url={TILE_URL} maxNativeZoom={16} />
      {layers.flatMap((layer) =>
        layer.features.map((feature) => {
          const isSelected = selected === `${layer.id}:${feature.id}`;
          return (
            <CircleMarker
              key={`${layer.id}:${feature.id}`}
              center={[feature.lat, feature.lon]}
              radius={isSelected ? 10 : 6}
              pathOptions={{ color: isSelected ? "#ffffff" : layer.color, fillColor: layer.color, fillOpacity: 0.85, weight: isSelected ? 3 : 1.5 }}
              eventHandlers={{ click: () => onSelect(layer.id, feature.id) }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                {feature.name}
              </Tooltip>
            </CircleMarker>
          );
        }),
      )}
    </MapContainer>
  );
}
