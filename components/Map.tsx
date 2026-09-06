"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { CATEGORY_COLORS, type ConflictEvent, type EventCategory } from "@/types/event";
import styles from "./Map.module.css";

const SAHEL_CENTER: [number, number] = [15, 5];
const DEFAULT_COLOR = "#999999";

interface MapProps {
  events: ConflictEvent[];
}

// react-leaflet's declarative `bounds` prop can compute a bogus view when
// applied before the container has its final layout size. Fitting bounds
// imperatively once the map instance is mounted (and already sized) is the
// reliable pattern.
function FitToEvents({ events }: { events: ConflictEvent[] }) {
  const map = useMap();

  useEffect(() => {
    if (events.length === 0) return;
    const bounds: [number, number][] = events.map((e) => [e.latitude, e.longitude]);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 6 });
  }, [map, events]);

  return null;
}

export default function Map({ events }: MapProps) {
  return (
    <MapContainer
      center={SAHEL_CENTER}
      zoom={5}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <FitToEvents events={events} />
      <TileLayer
        className={styles.darkTiles}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {events.map((event) => {
        const color = CATEGORY_COLORS[event.category as EventCategory] ?? DEFAULT_COLOR;
        return (
          <CircleMarker
            key={event.id}
            center={[event.latitude, event.longitude]}
            radius={5 + Math.min(event.fatalities, 20) / 4}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.7,
              weight: 1,
            }}
          >
            <Popup>
              <strong>{event.category}</strong>
              <br />
              {event.country} — {event.event_date}
              {event.notes ? (
                <>
                  <br />
                  {event.notes}
                </>
              ) : null}
              {event.fatalities > 0 ? (
                <>
                  <br />
                  Fatalités : {event.fatalities}
                </>
              ) : null}
              {event.source ? (
                <>
                  <br />
                  Source : {event.source}
                </>
              ) : null}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
