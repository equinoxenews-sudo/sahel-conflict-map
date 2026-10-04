"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useState } from "react";
import { GeoJSON, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { PathOptions } from "leaflet";
import type { Polygon } from "geojson";
import { useEffect } from "react";
import type { WorldGeoFeature } from "@/lib/worldGeo";
import styles from "./ZoneCountryLeafletMap.module.css";

export interface ApprocheCountry {
  id: string;
  name: string;
  feature: WorldGeoFeature;
}

interface ZoneCountryLeafletMapProps {
  countries: ApprocheCountry[];
  bounds: [[number, number], [number, number]];
  selected: string;
  onSelect: (id: string) => void;
}

const IMAGERY_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const IMAGERY_CREDIT = "Esri, Maxar, Earthstar Geographics";

// Un pays trop petit à l'écran n'affiche pas son nom (sinon les Balkans
// deviennent illisibles) ; il réapparaît en zoomant.
const MIN_LABEL_WIDTH_PX = 34;

const BASE_STYLE: PathOptions = { color: "#ffffff", weight: 1, opacity: 0.55, fillColor: "#000000", fillOpacity: 0 };
const HOVER_STYLE: PathOptions = { color: "#ffffff", weight: 1.6, opacity: 0.9, fillColor: "#c89b3c", fillOpacity: 0.18 };
const SELECTED_STYLE: PathOptions = { color: "#e0b44c", weight: 2.2, opacity: 1, fillColor: "#c89b3c", fillOpacity: 0.35 };

function styleFor(selected: boolean): PathOptions {
  return selected ? SELECTED_STYLE : BASE_STYLE;
}

// Cadrage posé une fois le conteneur mesuré (même raison que
// components/Map.tsx : un cadrage déclaratif peut se calculer sur une taille
// périmée).
function FitToBounds({ bounds }: { bounds: [[number, number], [number, number]] }) {
  const map = useMap();
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [8, 8], animate: false });
    });
    return () => cancelAnimationFrame(id);
  }, [map, bounds]);
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

// Emprise du plus grand morceau d'un pays à territoires multiples (Russie,
// Norvège…) : le centre de l'emprise totale peut tomber en pleine mer, la
// Russie traversant l'antiméridien.
function polygonBounds(coordinates: Polygon["coordinates"]): L.LatLngBounds {
  const polygon: Polygon = { type: "Polygon", coordinates };
  return L.geoJSON(polygon).getBounds();
}

function mainBounds(feature: WorldGeoFeature): L.LatLngBounds {
  const geometry = feature.geometry;
  if (geometry.type === "Polygon") return L.geoJSON(feature).getBounds();
  let best = polygonBounds(geometry.coordinates[0]);
  let bestArea = -1;
  for (const coordinates of geometry.coordinates) {
    const bounds = polygonBounds(coordinates);
    const area = (bounds.getNorth() - bounds.getSouth()) * (bounds.getEast() - bounds.getWest());
    if (area > bestArea) {
      best = bounds;
      bestArea = area;
    }
  }
  return best;
}

// Partie du pays réellement visible dans le cadre de la zone : le nom se
// place là, pas au centre d'un pays dont la majorité est hors champ.
function visibleBounds(feature: WorldGeoFeature, frame: [[number, number], [number, number]]): L.LatLngBounds | null {
  const main = mainBounds(feature);
  const view = L.latLngBounds(L.latLng(frame[0]), L.latLng(frame[1]));
  if (!main.intersects(view)) return null;
  return L.latLngBounds(
    [Math.max(main.getSouth(), view.getSouth()), Math.max(main.getWest(), view.getWest())],
    [Math.min(main.getNorth(), view.getNorth()), Math.min(main.getEast(), view.getEast())]
  );
}

function CountryLabels({
  countries,
  selected,
  frame,
}: {
  countries: ApprocheCountry[];
  selected: string;
  frame: [[number, number], [number, number]];
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  return (
    <>
      {countries.map(({ id, name, feature }) => {
        const bounds = visibleBounds(feature, frame);
        if (!bounds) return null;
        const widthPx = map.project(bounds.getNorthEast(), zoom).x - map.project(bounds.getSouthWest(), zoom).x;
        if (id !== selected && widthPx < MIN_LABEL_WIDTH_PX) return null;
        return (
          <Marker
            key={id}
            position={bounds.getCenter()}
            interactive={false}
            keyboard={false}
            icon={L.divIcon({
              className: id === selected ? `${styles.label} ${styles.labelSelected}` : styles.label,
              html: name,
              iconSize: [0, 0],
            })}
          />
        );
      })}
    </>
  );
}

export default function ZoneCountryLeafletMap({ countries, bounds, selected, onSelect }: ZoneCountryLeafletMapProps) {
  return (
    <MapContainer
      bounds={bounds}
      scrollWheelZoom={false}
      zoomSnap={0.25}
      attributionControl
      className={styles.map}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <AutoResize />
      <FitToBounds bounds={bounds} />
      <TileLayer attribution={IMAGERY_CREDIT} url={IMAGERY_URL} maxNativeZoom={17} />
      {countries.map(({ id, name, feature }) => (
        <GeoJSON
          key={id}
          data={feature}
          style={styleFor(id === selected)}
          eventHandlers={{
            click: () => onSelect(id),
            mouseover: (e) => {
              if (id !== selected) e.target.setStyle(HOVER_STYLE);
            },
            mouseout: (e) => e.target.setStyle(styleFor(id === selected)),
          }}
          onEachFeature={(_feature, layer) => layer.bindTooltip(name, { sticky: true, direction: "top", className: styles.tooltip })}
        />
      ))}
      <CountryLabels countries={countries} selected={selected} frame={bounds} />
    </MapContainer>
  );
}
