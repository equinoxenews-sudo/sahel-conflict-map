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
  onEntitySelect: (data: EntityPopupData | null, screen: { x: number; y: number } | null) => void;
}

export default function Globe3DLoader(props: Globe3DLoaderProps) {
  return <Globe3D {...props} />;
}
