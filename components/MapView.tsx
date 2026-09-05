"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { ConflictEvent } from "@/types/event";
import Filters from "./Filters";
import Legend from "./Legend";
import styles from "./MapView.module.css";

// Leaflet touches `window`, so the map itself must never be server-rendered.
const Map = dynamic(() => import("./Map"), { ssr: false });

interface MapViewProps {
  events: ConflictEvent[];
}

export default function MapView({ events }: MapViewProps) {
  const [country, setCountry] = useState("all");
  const [category, setCategory] = useState("all");

  const countries = useMemo(
    () => Array.from(new Set(events.map((e) => e.country))).sort(),
    [events]
  );

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        if (country !== "all" && event.country !== country) return false;
        if (category !== "all" && event.category !== category) return false;
        return true;
      }),
    [events, country, category]
  );

  return (
    <div className={styles.container}>
      <Filters
        countries={countries}
        country={country}
        category={category}
        onCountryChange={setCountry}
        onCategoryChange={setCategory}
      />
      <Legend />
      <div className={styles.mapWrapper}>
        <Map events={filteredEvents} />
      </div>
      <div className={styles.footer}>
        {filteredEvents.length} événement(s) affiché(s) sur {events.length} (30 derniers jours)
      </div>
    </div>
  );
}
