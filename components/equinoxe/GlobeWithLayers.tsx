"use client";

import { useEffect, useMemo, useState } from "react";
import type { CountryRisk } from "@/lib/countryRisk";
import type { MilitaryAircraft } from "@/lib/layers/aircraft";
import type { Earthquake } from "@/lib/layers/earthquakes";
import type { Launch } from "@/lib/layers/launches";
import type { NaturalEvent } from "@/lib/layers/naturalEvents";
import type { SatellitePosition } from "@/lib/layers/satellites";
import { LAYER_DEFAULTS, type EntityPopupData, type LayerKey } from "@/lib/layers/types";
import { FOCUS_ZONE_EVENT, isHomeZone, type ZoneBriefsByZone, type ZoneSlug } from "@/lib/homeZones";
import type { VesselPosition } from "@/types/vessel";
import Globe3DLoader from "./Globe3DLoader";
import GlobeClock from "./GlobeClock";
import GlobeEntityPopup from "./GlobeEntityPopup";
import GlobeSearchBox from "./GlobeSearchBox";
import type { GlobeDateRange } from "./GlobeTimeRange";
import GlobeTimeRange from "./GlobeTimeRange";
import styles from "./GlobeWithLayers.module.css";
import LayersPanel from "./LayersPanel";
import MobileSheet from "./MobileSheet";
import RiskLevelPanel from "./RiskLevelPanel";
import ZoneStage from "./ZoneStage";

interface GlobeWithLayersProps {
  countryRisk: Record<string, CountryRisk>;
  aircraft: MilitaryAircraft[];
  satellites: SatellitePosition[];
  vessels: VesselPosition[];
  earthquakes: Earthquake[];
  naturalEvents: NaturalEvent[];
  launches: Launch[];
  gdeltStatus: { hoursSinceSuccess: number | null; stale: boolean };
  /** Derniers articles de chaque zone (carrousel de la fiche de zone). */
  zoneBriefs: ZoneBriefsByZone;
}

export default function GlobeWithLayers({
  countryRisk,
  aircraft,
  satellites,
  vessels,
  earthquakes,
  naturalEvents,
  launches,
  gdeltStatus,
  zoneBriefs,
}: GlobeWithLayersProps) {
  const [enabledLayers, setEnabledLayers] = useState<Record<LayerKey, boolean>>(LAYER_DEFAULTS);
  const [mobileSheet, setMobileSheet] = useState<null | "layers" | "risk">(null);
  const [selectedEntity, setSelectedEntity] = useState<{
    data: EntityPopupData;
    x: number;
    y: number;
  } | null>(null);
  // null until GlobeTimeRange's own effect reports its default (full)
  // bounds on mount — Globe3D treats null as "no date filtering yet".
  const [dateRange, setDateRange] = useState<GlobeDateRange | null>(null);
  // Zone mise au centre du globe : choisie dans le menu du haut, sur le globe ou dans la fiche.
  const [focusedZone, setFocusedZoneState] = useState<ZoneSlug | null>(null);
  // Changer de zone referme la bulle ouverte : elle resterait accrochée à un point de l'écran
  // qui ne correspond plus à rien une fois le globe déplacé.
  function setFocusedZone(zone: ZoneSlug | null) {
    setSelectedEntity(null);
    setFocusedZoneState(zone);
  }

  useEffect(() => {
    const onFocus = (event: Event) => {
      const zone = (event as CustomEvent<{ zone?: string }>).detail?.zone;
      if (zone && isHomeZone(zone)) setFocusedZone(zone);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocusedZone(null);
    };
    window.addEventListener(FOCUS_ZONE_EVENT, onFocus);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener(FOCUS_ZONE_EVENT, onFocus);
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  function handleEntitySelect(data: EntityPopupData | null, screen: { x: number; y: number } | null) {
    setSelectedEntity(data && screen ? { data, x: screen.x, y: screen.y } : null);
  }

  const counts = useMemo<Record<LayerKey, number>>(
    () => ({
      risk: Object.keys(countryRisk).length,
      aircraft: aircraft.length,
      satellites: satellites.length,
      vessels: vessels.length,
      earthquakes: earthquakes.length,
      wildfires: naturalEvents.filter((e) => e.category === "wildfires").length,
      storms: naturalEvents.filter((e) => e.category === "severeStorms").length,
      volcanoes: naturalEvents.filter((e) => e.category === "volcanoes").length,
      floods: naturalEvents.filter((e) => e.category === "floods").length,
      launches: launches.length,
      nightLights: 0,
    }),
    [countryRisk, aircraft, satellites, vessels, earthquakes, naturalEvents, launches]
  );

  function toggleLayer(key: LayerKey) {
    setEnabledLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const totalEvents =
    aircraft.length +
    satellites.length +
    vessels.length +
    earthquakes.length +
    naturalEvents.length +
    launches.length;

  return (
    <>
      <div className={styles.globeColumn} data-intro-stage>
        <div className={styles.mapArea}>
          <Globe3DLoader
            countryRisk={countryRisk}
            enabledLayers={enabledLayers}
            aircraft={aircraft}
            satellites={satellites}
            vessels={vessels}
            earthquakes={earthquakes}
            naturalEvents={naturalEvents}
            launches={launches}
            dateRange={dateRange}
            onEntitySelect={handleEntitySelect}
            focusZone={focusedZone}
            onZonePick={setFocusedZone}
          />
          <GlobeClock />
          {focusedZone ? (
            <ZoneStage zone={focusedZone} briefs={zoneBriefs[focusedZone]} onClose={() => setFocusedZone(null)} />
          ) : null}
          {selectedEntity ? (
            <GlobeEntityPopup
              data={selectedEntity.data}
              x={selectedEntity.x}
              y={selectedEntity.y}
              onClose={() => setSelectedEntity(null)}
            />
          ) : null}
        </div>

        <div className={focusedZone ? `${styles.legendBar} ${styles.legendBarHidden}` : styles.legendBar} data-intro-hide>
          <span className={styles.disclaimer}>
            Calculé à partir des événements recensés sur chaque zone (90 derniers jours) — cliquez
            sur une zone du menu pour une analyse détaillée
          </span>
          {gdeltStatus.stale && gdeltStatus.hoursSinceSuccess != null ? (
            <span className={styles.staleWarning}>
              ⚠ Données non rafraîchies depuis {Math.floor(gdeltStatus.hoursSinceSuccess)}h
            </span>
          ) : null}
        </div>
      </div>

      <div className={styles.rightStack} data-intro-hide>
        <GlobeSearchBox />
        <LayersPanel enabled={enabledLayers} counts={counts} onToggle={toggleLayer} />
        <GlobeTimeRange onChange={setDateRange} />
        <RiskLevelPanel />
      </div>

      <div className={focusedZone ? `${styles.mobileFabs} ${styles.mobileFabsHidden}` : styles.mobileFabs} data-intro-hide>
        <button
          type="button"
          className={styles.fab}
          aria-label="Couches"
          onClick={() => setMobileSheet("layers")}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3 3 8l9 5 9-5-9-5Z" />
            <path d="M3 12l9 5 9-5" />
            <path d="M3 16l9 5 9-5" />
          </svg>
        </button>
        <button
          type="button"
          className={styles.fab}
          aria-label="Niveau de risque"
          onClick={() => setMobileSheet("risk")}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="8.5" />
            <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
          </svg>
        </button>
      </div>

      {mobileSheet === "layers" ? (
        <MobileSheet title="Couches" onBack={() => setMobileSheet(null)}>
          <LayersPanel enabled={enabledLayers} counts={counts} onToggle={toggleLayer} />
          <div className={styles.mobileTimeRange}>
            <GlobeTimeRange onChange={setDateRange} />
          </div>
        </MobileSheet>
      ) : null}

      {mobileSheet === "risk" ? (
        <MobileSheet title="Niveau de risque" onBack={() => setMobileSheet(null)}>
          <RiskLevelPanel />
          <div className={styles.eventCount}>
            <span>Événements en temps réel</span>
            <strong>{totalEvents}</strong>
            <span className={styles.eventCountLabel}>événements actifs dans le monde</span>
          </div>
        </MobileSheet>
      ) : null}
    </>
  );
}
