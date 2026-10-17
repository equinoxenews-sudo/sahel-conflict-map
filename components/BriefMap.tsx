"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { confidenceColor } from "@/lib/confidence";
import { formatDate } from "@/lib/formatDate";
import type { ZoneMapView } from "@/lib/zoneMapViews";
import type { ZoneBrief } from "@/types/brief";
import ConfidenceBar from "./ConfidenceBar";
import styles from "./BriefMap.module.css";

// Carte d'actualités des zones « analyste » : chaque synthèse géolocalisée
// (ville citée, ou capitale pour une information nationale) apparaît avec sa
// vignette, cerclée de la couleur de son indice de confiance.

const IMAGERY_CREDIT = "Esri, Maxar, Earthstar Geographics";
const FALLBACK_CENTER: [number, number] = [12, 10];

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function iconFor(brief: ZoneBrief): L.DivIcon {
  const color = confidenceColor(brief.confidence_label);
  const image = brief.image_url
    ? `<img src="${escapeAttr(brief.image_url)}" referrerpolicy="no-referrer" alt="" />`
    : `<span class="${styles.noImage}">●</span>`;
  return L.divIcon({
    className: styles.pinWrap,
    html: `<span class="${styles.pin}" style="border-color:${color}">${image}</span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -18],
  });
}

/** Les synthèses placées au même endroit (souvent une capitale) sont écartées en couronne. */
function spread(briefs: ZoneBrief[]): { brief: ZoneBrief; position: [number, number] }[] {
  const byPlace = new Map<string, ZoneBrief[]>();
  for (const b of briefs) {
    const key = `${b.latitude!.toFixed(3)},${b.longitude!.toFixed(3)}`;
    byPlace.set(key, [...(byPlace.get(key) ?? []), b]);
  }
  return [...byPlace.values()].flatMap((group) =>
    group.map((brief, i) => {
      if (i === 0) return { brief, position: [brief.latitude!, brief.longitude!] as [number, number] };
      const angle = (i * 2 * Math.PI) / Math.min(group.length - 1, 8);
      const radius = 0.12 * (1 + Math.floor((i - 1) / 8));
      return { brief, position: [brief.latitude! + radius * Math.sin(angle), brief.longitude! + radius * Math.cos(angle)] as [number, number] };
    }),
  );
}

function Resize() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function Frame({ view, points }: { view?: ZoneMapView; points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      map.invalidateSize();
      if (view) {
        const narrow = map.getContainer().clientWidth < 900;
        map.setView(view.center, narrow ? view.zoom - 1 : view.zoom, { animate: false });
      } else if (points.length) {
        map.fitBounds(points, { padding: [50, 50], maxZoom: 6 });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [map, view, points]);
  return null;
}

export default function BriefMap({ briefs, defaultView }: { briefs: ZoneBrief[]; defaultView?: ZoneMapView }) {
  const placed = useMemo(
    () => spread(briefs.filter((b) => b.latitude != null && b.longitude != null)),
    [briefs],
  );
  const points = useMemo(() => placed.map((p) => p.position), [placed]);

  return (
    <MapContainer center={FALLBACK_CENTER} zoom={4} scrollWheelZoom style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <Resize />
      <Frame view={defaultView} points={points} />
      <TileLayer
        attribution={IMAGERY_CREDIT}
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxNativeZoom={17}
      />
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
        maxNativeZoom={13}
      />
      {placed.map(({ brief, position }) => (
        <Marker key={brief.id} position={position} icon={iconFor(brief)}>
          <Popup>
            <div className={styles.popup}>
              <span className={styles.popupMeta}>
                {formatDate(brief.published_at)}
                {brief.place_name ? ` · ${brief.place_name}` : ""}
                {brief.geo_precision === "capitale" ? " (national)" : ""}
              </span>
              <Link href={`/briefs/${brief.id}`} className={styles.popupTitle}>
                {brief.title}
              </Link>
              {brief.confidence != null && brief.confidence_label ? (
                <ConfidenceBar
                  compact
                  percent={brief.confidence}
                  label={brief.confidence_label}
                  sourceCount={brief.source_count ?? brief.source_urls.length}
                  claimedBy={brief.claimed_by}
                />
              ) : null}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
