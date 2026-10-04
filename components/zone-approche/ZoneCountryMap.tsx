"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getCountrySlugByIso3 } from "@/lib/countries";
import { ZONE_APPROCHE_BOUNDS } from "@/lib/zoneMapViews";
import type { ApprocheCountry } from "./ZoneCountryLeafletMap";
import styles from "./ZoneCountryMap.module.css";

// Leaflet touches `window`, so the map must never be server-rendered.
const ZoneCountryLeafletMap = dynamic(() => import("./ZoneCountryLeafletMap"), { ssr: false });

interface ZoneCountryMapProps {
  zoneSlug: string;
  countries: ApprocheCountry[];
  featured: string[];
}

export default function ZoneCountryMap({ zoneSlug, countries, featured }: ZoneCountryMapProps) {
  // Aucun pays n'est présélectionné : la carte s'ouvre sans surbrillance.
  const [selected, setSelected] = useState("");
  const router = useRouter();
  const bounds = ZONE_APPROCHE_BOUNDS[zoneSlug];

  // Un pays qui a une fiche ouvre directement cette fiche ; sinon on met
  // simplement le pays en surbrillance.
  function handleSelect(id: string) {
    const profileSlug = getCountrySlugByIso3(id);
    if (profileSlug) {
      router.push(`/zones/${zoneSlug}/approche/pays/${profileSlug}`);
      return;
    }
    setSelected(id);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.mapBox}>
        {bounds ? (
          <ZoneCountryLeafletMap countries={countries} bounds={bounds} selected={selected} onSelect={handleSelect} />
        ) : null}
      </div>

      <div className={styles.countryButtons}>
        {featured.map((id) => {
          const country = countries.find((c) => c.id === id);
          if (!country) return null;
          return (
            <button
              key={id}
              type="button"
              className={id === selected ? `${styles.countryBtn} ${styles.countryBtnActive}` : styles.countryBtn}
              onClick={() => handleSelect(id)}
            >
              {country.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
