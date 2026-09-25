"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ConflictEvent } from "@/types/event";
import Filters from "./Filters";
import Legend from "./Legend";
import styles from "./MapView.module.css";
import TimeRangeSlider, { type DateRange } from "./TimeRangeSlider";

// Leaflet touches `window`, so the map itself must never be server-rendered.
const Map = dynamic(() => import("./Map"), { ssr: false });

interface MapViewProps {
  events: ConflictEvent[];
}

export default function MapView({ events }: MapViewProps) {
  const [country, setCountry] = useState("all");
  const [category, setCategory] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

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

  const selectedEvent = filteredEvents.find((event) => event.id === selectedEventId);
  const recentEvents = useMemo(
    () => [...filteredEvents].sort((a, b) => b.event_date.localeCompare(a.event_date)).slice(0, 50),
    [filteredEvents]
  );
  const listedEvents = selectedEvent && !recentEvents.some((event) => event.id === selectedEvent.id)
    ? [selectedEvent, ...recentEvents]
    : recentEvents;

  useEffect(() => {
    selectedItemRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedEventId]);

  return (
    <div className={styles.container}>
      <TimeRangeSlider onChange={handleDateRangeChange} />
      <Filters
        countries={countries}
        country={country}
        category={category}
        onCountryChange={setCountry}
        onCategoryChange={setCategory}
      />
      <Legend />
      <div className={styles.explorer}>
        <div className={styles.mapWrapper}>
          <Map
            events={filteredEvents}
            selectedEventId={selectedEventId}
            onSelectEvent={setSelectedEventId}
          />
        </div>
        <section className={styles.eventList} aria-label="Événements de la carte">
          <h2 className={styles.eventListTitle}>Événements sur la carte</h2>
          <p className={styles.eventListHint}>Sélectionnez un événement pour le localiser. Les brèves à gauche sont un flux distinct.</p>
          {listedEvents.length === 0 ? <p className={styles.eventListHint}>Aucun événement pour ces filtres.</p> : null}
          {listedEvents.map((event) => (
            <button
              key={event.id}
              ref={event.id === selectedEventId ? selectedItemRef : undefined}
              type="button"
              aria-pressed={event.id === selectedEventId}
              className={event.id === selectedEventId ? styles.eventSelected : styles.eventItem}
              onClick={() => setSelectedEventId(event.id)}
            >
              <span className={styles.eventDate}>{event.event_date} · {event.country}</span>
              <strong>{event.category}</strong>
              <span>{event.summary?.trim() || "Voir le point et sa source sur la carte."}</span>
            </button>
          ))}
          {filteredEvents.length > recentEvents.length ? (
            <p className={styles.eventListHint}>Les 50 événements les plus récents sont listés. Tous les points filtrés restent accessibles sur la carte.</p>
          ) : null}
        </section>
      </div>
      <div className={styles.footer}>
        {filteredEvents.length} événement(s) affiché(s) sur {events.length} (fenêtre sélectionnée)
      </div>
    </div>
  );
}
