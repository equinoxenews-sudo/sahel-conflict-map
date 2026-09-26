"use client";

import dynamic from "next/dynamic";
import type { CountryMapData } from "./CountryLeafletMap";
import styles from "./CountryMap.module.css";

// Leaflet touches `window`, so the map itself must never be server-rendered
// — same pattern as components/MapView.tsx wrapping components/Map.tsx.
const CountryLeafletMap = dynamic(() => import("./CountryLeafletMap"), { ssr: false });

export type { CountryMapData };

export default function CountryMap({ data }: { data: CountryMapData }) {
  return (
    <div className={styles.mapBox}>
      <CountryLeafletMap data={data} />
    </div>
  );
}
