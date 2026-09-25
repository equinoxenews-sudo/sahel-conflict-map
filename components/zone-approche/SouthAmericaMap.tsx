"use client";

import { useState } from "react";
import { SOUTH_AMERICA_COUNTRIES, SOUTH_AMERICA_VIEWBOX } from "@/lib/southAmericaMap";
import styles from "./SouthAmericaMap.module.css";

const FEATURED_COUNTRY_IDS = ["BRA", "COL", "VEN", "GUY"];

export default function SouthAmericaMap() {
  const [selected, setSelected] = useState("BRA");

  return (
    <div className={styles.wrap}>
      <div className={styles.mapBox}>
        <svg viewBox={SOUTH_AMERICA_VIEWBOX} className={styles.svg} role="img" aria-label="Carte de l'Amérique du Sud">
          {SOUTH_AMERICA_COUNTRIES.map((country) => (
            <path
              key={country.id}
              d={country.path}
              className={country.id === selected ? `${styles.country} ${styles.countrySelected}` : styles.country}
              onClick={() => setSelected(country.id)}
            >
              <title>{country.name}</title>
            </path>
          ))}
          {SOUTH_AMERICA_COUNTRIES.map((country) => (
            <text
              key={`label-${country.id}`}
              x={country.label[0]}
              y={country.label[1]}
              className={country.id === selected ? `${styles.label} ${styles.labelSelected}` : styles.label}
            >
              {country.name}
            </text>
          ))}
          <text x={40} y={505} className={styles.oceanLabel}>
            <tspan x={40} dy={0}>
              Océan
            </tspan>
            <tspan x={40} dy={13}>
              Pacifique
            </tspan>
          </text>
          <text x={555} y={505} className={styles.oceanLabel}>
            <tspan x={555} dy={0}>
              Océan
            </tspan>
            <tspan x={555} dy={13}>
              Atlantique
            </tspan>
          </text>
        </svg>
      </div>

      <div className={styles.countryButtons}>
        {FEATURED_COUNTRY_IDS.map((id) => {
          const country = SOUTH_AMERICA_COUNTRIES.find((c) => c.id === id);
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
