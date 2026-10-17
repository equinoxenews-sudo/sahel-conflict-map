"use client";

import dynamic from "next/dynamic";
import type { MapSpec } from "@/lib/articleBlocks";
import { confidenceColor } from "@/lib/confidence";
import styles from "./ArticleBlocks.module.css";

const ArticleMap = dynamic(() => import("./ArticleMap"), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Chargement de la carte…</div>,
});

const dayFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

function day(value: string | null): string | null {
  if (!value) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : null;
  return d && !Number.isNaN(d.getTime()) ? dayFormat.format(d) : value;
}

/** Carte + légende détaillée (lieu, date, fait, confiance, précision de la localisation). */
export default function ArticleMapBlock({ spec }: { spec: MapSpec }) {
  const points = spec.points.map((p) => ({ ...p, date: day(p.date) }));
  return (
    <figure className={styles.figure}>
      {spec.titre && <figcaption className={styles.chartTitle}>{spec.titre}</figcaption>}
      <div className={styles.mapBox}>
        <ArticleMap points={points} />
      </div>
      <ol className={styles.mapLegend}>
        {points.map((p, i) => (
          <li key={i}>
            <span className={styles.mapDot} style={{ background: confidenceColor(p.confiance) }} aria-hidden="true" />
            <span>
              <b>{p.lieu}</b>
              {p.date ? ` · ${p.date}` : ""}
              {p.confiance ? ` · ${p.confiance}` : ""}
              {p.fait && <span className={styles.mapFact}>{p.fait}</span>}
              {p.precision && <span className={styles.mapPrecision}>Localisation : {p.precision}</span>}
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}
