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
import styles from "./GlobeWithLayers.module.css";
import LayersPanel from "./LayersPanel";
import RiskLegend from "./RiskLegend";

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
        </div>

        <div className={styles.legendBar}>
          <RiskLegend />
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

      <LayersPanel enabled={enabledLayers} counts={counts} onToggle={toggleLayer} />
    </>
  );
}
