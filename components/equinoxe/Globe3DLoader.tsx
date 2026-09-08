"use client";

import dynamic from "next/dynamic";
import type { CountryRisk } from "@/lib/countryRisk";

const Globe3D = dynamic(() => import("./Globe3D"), { ssr: false });

interface Globe3DLoaderProps {
  countryRisk: Record<string, CountryRisk>;
}

export default function Globe3DLoader({ countryRisk }: Globe3DLoaderProps) {
  return <Globe3D countryRisk={countryRisk} />;
}
