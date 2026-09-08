"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { clampReliability, computeReliability, RELIABILITY_COLORS } from "@/lib/reliability";
import { CATEGORY_COLORS, type ConflictEvent, type EventCategory } from "@/types/event";
import styles from "./Map.module.css";

const SAHEL_CENTER: [number, number] = [15, 5];
const DEFAULT_COLOR = "#999999";

function getSourceDomain(source: string): string | null {
  try {
    return new URL(source).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// The `num_mentions` column only exists once the reliability-score
// migration has run (supabase/add-reliability-score.sql) — until then (or
// for older rows synced before it), fall back to parsing the same count
// back out of the "Score Goldstein : X.X · N mention(s)" notes text.
function mentionsCount(event: ConflictEvent): number | null {
  if (event.num_mentions) return event.num_mentions;
  const match = event.notes?.match(/(\d+)\s*mention/);
  return match ? Number(match[1]) : null;
}

function buildSummary(event: ConflictEvent, mentions: number | null): string {
  const parts: string[] = [];
  if (event.fatalities > 0) {
    parts.push(`${event.fatalities} victime(s) rapportée(s)`);
  }
  if (mentions) {
    parts.push(`rapporté par ${mentions} source(s) média indépendante(s)`);
  }
  return parts.length > 0
    ? `${parts.join(", ")}.`
    : "Aucun détail supplémentaire disponible pour cet événement.";
}

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

    // Force Leaflet to re-measure the container before fitting — if the
    // flex layout hasn't finished sizing it yet, fitBounds computes the
    // zoom against a stale (often near-zero) size and the result is wrong.
    const id = requestAnimationFrame(() => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 6 });
    });

    return () => cancelAnimationFrame(id);
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
        const mentions = mentionsCount(event);
        const reliability =
          event.reliability != null
            ? clampReliability(event.reliability)
            : computeReliability(mentions ?? 0);
        const sourceDomain = event.source ? getSourceDomain(event.source) : null;

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
              <div className={styles.popupCard} style={{ borderColor: color }}>
                <h3 className={styles.popupTitle} style={{ color }}>
                  {event.category}
                </h3>

                <div className={styles.popupRow}>
                  <span className={styles.popupLabel}>Pays</span>
                  <span>{event.country}</span>
                </div>

                <div className={styles.popupRow}>
                  <span className={styles.popupLabel}>Date</span>
                  <span>{event.event_date}</span>
                </div>

                <div className={styles.popupRow}>
                  <span className={styles.popupLabel}>Score de fiabilité</span>
                  <span
                    className={styles.reliabilityBadge}
                    style={{ backgroundColor: RELIABILITY_COLORS[reliability] }}
                  >
                    {reliability}
                  </span>
                </div>

                <div className={styles.popupRow}>
                  <span className={styles.popupLabel}>Source</span>
                  {sourceDomain ? (
                    <a
                      href={event.source ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.popupLink}
                    >
                      {sourceDomain}
                    </a>
                  ) : (
                    <span>{event.source ?? "Non renseignée"}</span>
                  )}
                </div>

                <p className={styles.popupSummary}>{buildSummary(event, mentions)}</p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
