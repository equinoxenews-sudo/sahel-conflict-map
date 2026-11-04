"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import { iconForKind, iconSvg } from "@/lib/approche/icons";
import type { MapLayer, MapModule } from "@/lib/approche/modules";
import styles from "./Approche.module.css";

// Fond sombre d'Esri : lisible sous des marqueurs colorés (le satellite des fiches pays masquerait les couches).
const TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const TILE_CREDIT = "Esri, HERE, Garmin, © OpenStreetMap contributors";

interface Props {
  layers: MapLayer[];
  view: MapModule["view"];
  hub: MapModule["hub"];
  /** « couche:objet » de l'objet sélectionné. */
  selected: string | null;
  resetToken: number;
  onSelect: (layerId: string, featureId: string) => void;
}

// Même correction que components/Map.tsx : la carte se redimensionne avec son conteneur (plein écran compris).
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

/** Marqueur rond de la couleur de la couche, avec le pictogramme de l'objet (HTML pour Leaflet). */
function markerIcon(color: string, icon: string, selected: boolean, ink = "#ffffff"): L.DivIcon {
  const size = selected ? 34 : 26;
  return L.divIcon({
    className: `${styles.pin} ${selected ? styles.pinSelected : ""}`,
    html: `<span style="background:${color};width:${size}px;height:${size}px">${iconSvg(icon, selected ? 18 : 14, ink)}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function ApprocheLeafletMap({ layers, view, hub, selected, resetToken, onSelect }: Props) {
  const entries = useMemo(
    () =>
      layers.flatMap((layer) =>
        layer.features.map((feature) => {
          const key = `${layer.id}:${feature.id}`;
          const icon = layer.icon ?? iconForKind(feature.kind, iconForKind(layer.title, "dot"));
          return { key, layer, feature, icon };
        }),
      ),
    [layers],
  );
  const chosen = entries.find((entry) => entry.key === selected);

  return (
    <MapContainer center={[view.lat, view.lon]} zoom={view.zoom} minZoom={2} scrollWheelZoom worldCopyJump className={styles.leaflet} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <AutoResize />
      <ResetView view={view} token={resetToken} />
      <FlyToSelection layers={layers} selected={selected} />
      <TileLayer attribution={TILE_CREDIT} url={TILE_URL} maxNativeZoom={16} />
      {hub && chosen ? <Polyline positions={[[hub.lat, hub.lon], [chosen.feature.lat, chosen.feature.lon]]} pathOptions={{ color: chosen.layer.color, weight: 2, opacity: 0.8, dashArray: "6 6" }} /> : null}
      {entries.map(({ key, layer, feature, icon }) => (
        <Marker key={key} position={[feature.lat, feature.lon]} icon={markerIcon(layer.color, icon, selected === key)} zIndexOffset={selected === key ? 1000 : 0} eventHandlers={{ click: () => onSelect(layer.id, feature.id) }}>
          <Tooltip direction="top" offset={[0, -14]}>
            {feature.name}
          </Tooltip>
        </Marker>
      ))}
      {hub ? (
        <Marker position={[hub.lat, hub.lon]} icon={markerIcon("#f1f4f7", "star", false, "#0a1422")} interactive={false}>
          <Tooltip direction="top" offset={[0, -14]} permanent={false}>
            {hub.name}
          </Tooltip>
        </Marker>
      ) : null}
    </MapContainer>
  );
}
