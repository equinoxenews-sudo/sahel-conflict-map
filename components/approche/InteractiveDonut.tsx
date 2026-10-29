"use client";

import { useState } from "react";
import styles from "./Approche.module.css";

export interface DonutSlice {
  id: string;
  label: string;
  /** Part en pourcentage (valeur calculée et déjà arrondie). */
  share: number;
  /** Valeur absolue mise en forme (ex. « 445 Md € »). */
  amount: string;
  color: string;
}

interface InteractiveDonutProps {
  slices: DonutSlice[];
  center: string;
  label: string;
}

// Anneau interactif : survol ou clic (ou clavier) sur une branche pour afficher sa part et son montant au centre ; la légende à
// droite liste toutes les branches. Les valeurs viennent des observations ; l'anneau ne dessine que des parts calculées.
export default function InteractiveDonut({ slices, center, label }: InteractiveDonutProps) {
  const [active, setActive] = useState<string | null>(null);
  const total = slices.reduce((sum, slice) => sum + slice.share, 0);
  const radius = 76;
  const circumference = 2 * Math.PI * radius;
  const current = slices.find((slice) => slice.id === active) ?? null;
  const arcs = slices.map((slice, index) => ({
    slice,
    length: (slice.share / total) * circumference,
    start: slices.slice(0, index).reduce((sum, previous) => sum + (previous.share / total) * circumference, 0),
  }));

  return (
    <div className={styles.donutWrap}>
      <svg viewBox="0 0 200 200" className={styles.donutSvg} role="img" aria-label={label}>
        <g transform="rotate(-90 100 100)">
          {arcs.map(({ slice, length, start }) => (
            <circle
              key={slice.id}
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={active === slice.id ? 30 : 24}
              strokeDasharray={`${Math.max(length - 1.5, 0)} ${circumference - Math.max(length - 1.5, 0)}`}
              strokeDashoffset={-start}
              opacity={active && active !== slice.id ? 0.35 : 1}
              style={{ cursor: "pointer", transition: "stroke-width 0.15s, opacity 0.15s" }}
              onMouseEnter={() => setActive(slice.id)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(active === slice.id ? null : slice.id)}
            />
          ))}
        </g>
        <text x="100" y={current ? 92 : 104} textAnchor="middle" fontSize={current ? 26 : 18} fontWeight="700" fill="currentColor">
          {current ? `${current.share} %` : center}
        </text>
        {current ? (
          <text x="100" y="114" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.8">
            {current.amount}
          </text>
        ) : null}
      </svg>

      <ul className={styles.donutList} aria-label="Légende">
        {slices.map((slice) => (
          <li key={slice.id}>
            <button
              type="button"
              className={active === slice.id ? `${styles.donutItem} ${styles.donutItemOn}` : styles.donutItem}
              onMouseEnter={() => setActive(slice.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(slice.id)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(active === slice.id ? null : slice.id)}
              aria-pressed={active === slice.id}
            >
              <i style={{ background: slice.color }} aria-hidden />
              <span className={styles.donutLabel}>{slice.label}</span>
              <strong>{slice.share} %</strong>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
