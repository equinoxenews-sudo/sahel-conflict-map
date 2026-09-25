"use client";

import { useState } from "react";
import type { ZoneMapData } from "@/lib/zoneMaps";
import styles from "./ZoneCountryMap.module.css";

interface ZoneCountryMapProps {
  data: ZoneMapData;
}

export default function ZoneCountryMap({ data }: ZoneCountryMapProps) {
  const [selected, setSelected] = useState(data.featured[0] ?? data.countries[0]?.id ?? "");

  return (
    <div className={styles.wrap}>
      <div className={styles.mapBox}>
        <svg viewBox={data.viewBox} className={styles.svg} role="img" aria-label="Carte de la zone">
          {data.countries.map((country) => (
            <path
              key={country.id}
              d={country.path}
              className={country.id === selected ? `${styles.country} ${styles.countrySelected}` : styles.country}
              onClick={() => setSelected(country.id)}
            >
              <title>{country.name}</title>
            </path>
          ))}
          {data.countries.map((country) => (
            <text
              key={`label-${country.id}`}
              x={country.label[0]}
              y={country.label[1]}
              className={country.id === selected ? `${styles.label} ${styles.labelSelected}` : styles.label}
            >
              {country.name}
            </text>
          ))}
          {data.oceanLabels?.map((ocean, i) => (
            <text key={`ocean-${i}`} x={ocean.x} y={ocean.y} className={styles.oceanLabel}>
              {ocean.lines.map((line, j) => (
                <tspan key={line} x={ocean.x} dy={j === 0 ? 0 : 13}>
                  {line}
                </tspan>
              ))}
            </text>
          ))}
        </svg>
      </div>

      <div className={styles.countryButtons}>
        {data.featured.map((id) => {
          const country = data.countries.find((c) => c.id === id);
          if (!country) return null;
          return (
            <button
              key={id}
              type="button"
              className={id === selected ? `${styles.countryBtn} ${styles.countryBtnActive}` : styles.countryBtn}
              onClick={() => setSelected(id)}
            >
              {country.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
