"use client";

import { useMemo, useState } from "react";
import type { CountryRisk } from "@/lib/countryRisk";
import type { MilitaryAircraft } from "@/lib/layers/aircraft";
import type { Earthquake } from "@/lib/layers/earthquakes";
import type { Launch } from "@/lib/layers/launches";
import type { NaturalEvent } from "@/lib/layers/naturalEvents";
import type { SatellitePosition } from "@/lib/layers/satellites";
import { LAYER_DEFAULTS, type LayerKey } from "@/lib/layers/types";
import type { VesselPosition } from "@/types/vessel";
import Globe3DLoader from "./Globe3DLoader";
import GlobeClock from "./GlobeClock";
import GlobeSearchBox from "./GlobeSearchBox";
import styles from "./GlobeWithLayers.module.css";
import LayersPanel from "./LayersPanel";
import MobileSheet from "./MobileSheet";
import RiskLevelPanel from "./RiskLevelPanel";

interface GlobeWithLayersProps {
  countryRisk: Record<string, CountryRisk>;
  aircraft: MilitaryAircraft[];
  satellites: SatellitePosition[];
  vessels: VesselPosition[];
  earthquakes: Earthquake[];
  naturalEvents: NaturalEvent[];
  launches: Launch[];
  gdeltStatus: { hoursSinceSuccess: number | null; stale: boolean };
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
}: GlobeWithLayersProps) {
  const [enabledLayers, setEnabledLayers] = useState<Record<LayerKey, boolean>>(LAYER_DEFAULTS);
  const [mobileSheet, setMobileSheet] = useState<null | "layers" | "risk">(null);

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
      <div className={styles.globeColumn}>
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
          />
          <GlobeClock />
        </div>

        <div className={styles.legendBar}>
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

      <div className={styles.rightStack}>
        <GlobeSearchBox />
        <LayersPanel enabled={enabledLayers} counts={counts} onToggle={toggleLayer} />
        <RiskLevelPanel />
      </div>

      <div className={styles.mobileFabs}>
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
