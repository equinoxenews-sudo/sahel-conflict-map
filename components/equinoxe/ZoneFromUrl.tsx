"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { FOCUS_ZONE_EVENT, isHomeZone } from "@/lib/homeZones";

// Lit ?zone=… dans l'adresse de l'accueil (retour depuis une page de zone, ancien lien
// /zones/europe, tuile « Zones » sur téléphone) et demande au globe de s'y centrer.
export default function ZoneFromUrl() {
  const zone = useSearchParams().get("zone");

  useEffect(() => {
    if (!zone || !isHomeZone(zone)) return;
    // Différé : le globe branche son écoute dans le même rendu.
    const timer = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(FOCUS_ZONE_EVENT, { detail: { zone } }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [zone]);

  return null;
}
