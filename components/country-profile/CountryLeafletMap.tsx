"use client";

import "leaflet/dist/leaflet.css";
import L, { type Layer, type PathOptions } from "leaflet";
import { useEffect } from "react";
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { CountryGeoCity } from "@/lib/countryGeoConfig";
import type { WorldGeoFeature } from "@/lib/worldGeo";
import styles from "./CountryLeafletMap.module.css";

export interface CountryMapData {
  main: WorldGeoFeature;
  mainName: string;
  neighbors: WorldGeoFeature[];
  // ISO3 (or other feature id) -> French display name, from
  // CountryGeoConfig.neighbors — the raw GeoJSON's properties.name is
  // English, so labels must come from this map instead.
  neighborNames: Record<string, string>;
  cities: CountryGeoCity[];
}

const MAIN_STYLE: PathOptions = {
  color: "#c89b3c",
  weight: 2,
  fillColor: "#c89b3c",
  fillOpacity: 0.22,
};

const NEIGHBOR_STYLE: PathOptions = {
  color: "#6e96be",
  weight: 1,
  fillColor: "#16283a",
  fillOpacity: 0.35,
};

function labelFeature(name: string | undefined, layer: Layer, className: string) {
  if (name) {
    layer.bindTooltip(name, { permanent: true, direction: "center", className });
  }
}

// Same reasoning as components/Map.tsx's FitToEvents — fitting bounds
// imperatively once the map is mounted (and sized) avoids the bogus view
// a declarative `bounds` prop can produce before layout settles.
function FitToCountry({ feature }: { feature: WorldGeoFeature }) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.geoJSON(feature).getBounds();
    const id = requestAnimationFrame(() => {
      map.invalidateSize();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });
    });
    return () => cancelAnimationFrame(id);
  }, [map, feature]);

  return null;
}

// Same ResizeObserver-based fix as components/Map.tsx's MapAutoResize.
function MapAutoResize() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

export default function CountryLeafletMap({ data }: { data: CountryMapData }) {
  return (
    <MapContainer
      center={[0, 0]}
      zoom={5}
      scrollWheelZoom
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <MapAutoResize />
      <FitToCountry feature={data.main} />
      <TileLayer
        className={styles.darkTiles}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {data.neighbors.map((feature) => (
        <GeoJSON
          key={feature.id}
          data={feature}
          style={NEIGHBOR_STYLE}
          onEachFeature={(_geoJsonFeature, layer) =>
            labelFeature(data.neighborNames[feature.id] ?? feature.properties?.name, layer, styles.neighborLabel)
          }
        />
      ))}
      <GeoJSON
        data={data.main}
        style={MAIN_STYLE}
        onEachFeature={(_geoJsonFeature, layer) => labelFeature(data.mainName, layer, styles.mainLabel)}
      />

      {data.cities.map((city) => (
        <CircleMarker
          key={city.name}
          center={[city.lat, city.lon]}
          radius={4}
          pathOptions={{ color: "#e0b44c", fillColor: "#f1f4f7", fillOpacity: 1, weight: 1.5 }}
        >
          <Tooltip permanent direction="right" offset={[6, 0]} className={styles.cityLabel}>
            {city.name}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
