"use client";

import dynamic from "next/dynamic";
import type { CountryRisk } from "@/lib/countryRisk";
import type { MilitaryAircraft } from "@/lib/layers/aircraft";
import type { Earthquake } from "@/lib/layers/earthquakes";
import type { Launch } from "@/lib/layers/launches";
import type { NaturalEvent } from "@/lib/layers/naturalEvents";
import type { SatellitePosition } from "@/lib/layers/satellites";
import type { EntityPopupData, LayerKey } from "@/lib/layers/types";
import type { VesselPosition } from "@/types/vessel";
import type { ZoneSlug } from "@/lib/cinematic/zoneMap";
import type { GlobeDateRange } from "./GlobeTimeRange";

const Globe3D = dynamic(() => import("./Globe3D"), { ssr: false });

interface Globe3DLoaderProps {
  countryRisk: Record<string, CountryRisk>;
  enabledLayers: Record<LayerKey, boolean>;
  aircraft: MilitaryAircraft[];
  satellites: SatellitePosition[];
  vessels: VesselPosition[];
  earthquakes: Earthquake[];
  naturalEvents: NaturalEvent[];
  launches: Launch[];
  dateRange: GlobeDateRange | null;
  onEntitySelect: (data: EntityPopupData | null, screen: { x: number; y: number } | null) => void;
  /** Zone au centre du globe (null : vue d'ensemble). */
  focusZone: ZoneSlug | null;
  /** Un clic sur un pays du globe demande sa zone. */
  onZonePick: (zone: ZoneSlug) => void;
}

export default function Globe3DLoader(props: Globe3DLoaderProps) {
  return <Globe3D {...props} />;
}
