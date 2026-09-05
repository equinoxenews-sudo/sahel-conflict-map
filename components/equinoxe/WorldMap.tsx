"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import type { Layer, PathOptions } from "leaflet";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import { COUNTRY_RISK, RISK_COLORS } from "@/lib/countryRisk";
import styles from "./WorldMap.module.css";

interface GeoFeature {
  type: "Feature";
  id: string;
  properties: { name: string };
  geometry: unknown;
}

interface GeoData {
  type: "FeatureCollection";
  features: GeoFeature[];
}

function styleForFeature(feature?: GeoFeature): PathOptions {
  const risk = feature?.id ? COUNTRY_RISK[feature.id] : undefined;

  if (!risk) {
    return {
      color: "#3a3a3a",
      weight: 0.5,
      fillColor: "#111111",
      fillOpacity: 0.35,
    };
  }

  return {
    color: "#ffffff",
    weight: 0.6,
    fillColor: RISK_COLORS[risk.tier],
    fillOpacity: 0.45,
  };
}

export default function WorldMap() {
  const [geoData, setGeoData] = useState<GeoData | null>(null);

  useEffect(() => {
    fetch("/data/world-countries.geo.json")
      .then((res) => res.json())
      .then(setGeoData)
      .catch((err) => console.error("Failed to load world geojson:", err));
  }, []);

  const onEachFeature = (feature: GeoFeature, layer: Layer) => {
    const risk = COUNTRY_RISK[feature.id];
    const name = feature.properties?.name ?? feature.id;
    const text = risk
      ? `<strong>${name}</strong><br/>${risk.label}`
      : `<strong>${name}</strong>`;
    layer.bindTooltip(text, { sticky: true, className: styles.tooltip });
  };

  return (
    <MapContainer
      center={[15, 10]}
      zoom={2}
      minZoom={2}
      maxBounds={[
        [-85, -180],
        [85, 180],
      ]}
      scrollWheelZoom
      className={styles.map}
      worldCopyJump
    >
      <TileLayer
        className={styles.darkTiles}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {geoData && (
        <GeoJSON
          data={geoData as never}
          style={styleForFeature as never}
          onEachFeature={onEachFeature as never}
        />
      )}
    </MapContainer>
  );
}
