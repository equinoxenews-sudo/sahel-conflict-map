"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import type { ConflictEvent } from "@/types/event";
import Filters from "./Filters";
import Legend from "./Legend";
import styles from "./MapView.module.css";
import TimeRangeSlider, { type DateRange } from "./TimeRangeSlider";
import { ZONE_MAP_VIEWS } from "@/lib/zoneMapViews";

// Leaflet touches `window`, so the map itself must never be server-rendered.
const Map = dynamic(() => import("./Map"), { ssr: false });

interface MapViewProps {
  events: ConflictEvent[];
  zoneSlug?: string;
}

export default function MapView({ events, zoneSlug }: MapViewProps) {
  const [country, setCountry] = useState("all");
  const [category, setCategory] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  const defaultView = zoneSlug ? ZONE_MAP_VIEWS[zoneSlug] : undefined;

  const handleDateRangeChange = useCallback((range: DateRange) => setDateRange(range), []);

  const countries = useMemo(
    () => Array.from(new Set(events.map((e) => e.country))).sort(),
    [events]
  );

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        if (country !== "all" && event.country !== country) return false;
        if (category !== "all" && event.category !== category) return false;
        if (dateRange) {
          const eventTime = new Date(event.event_date).getTime();
          if (eventTime < dateRange.start.getTime() || eventTime > dateRange.end.getTime()) {
            return false;
          }
        }
        return true;
      }),
    [events, country, category, dateRange]
  );

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <TimeRangeSlider onChange={handleDateRangeChange} />
        <Filters
          countries={countries}
          country={country}
          category={category}
          onCountryChange={setCountry}
          onCategoryChange={setCategory}
        />
      </div>
      <div className={styles.mapWrapper}>
        <Map
          events={filteredEvents}
          defaultView={defaultView}
          followEvents={country !== "all"}
          selectedEventId={selectedEventId}
          onSelectEvent={setSelectedEventId}
        />
        <div className={styles.overlay}>
          <Legend />
          <span className={styles.count}>
            {filteredEvents.length} événement(s) sur {events.length}
          </span>
        </div>
      </div>
    </div>
  );
}
