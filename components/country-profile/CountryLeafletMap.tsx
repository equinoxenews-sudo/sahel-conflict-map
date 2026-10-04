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

// Fond satellite Esri (le même que les cartes d'Actualité et d'Approche),
// sans sa couche de noms anglais : les noms viennent de nos propres données,
// en français.
const IMAGERY_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const IMAGERY_CREDIT = "Esri, Maxar, Earthstar Geographics";

const MAIN_STYLE: PathOptions = {
  color: "#e0b44c",
  weight: 2.5,
  fillColor: "#c89b3c",
  fillOpacity: 0.22,
};

const NEIGHBOR_STYLE: PathOptions = {
  color: "#ffffff",
  weight: 1,
  opacity: 0.55,
  fillOpacity: 0,
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
      <TileLayer attribution={IMAGERY_CREDIT} url={IMAGERY_URL} maxNativeZoom={17} />

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
