"use client";

import dynamic from "next/dynamic";
import { CONFIDENCE_LEVELS } from "@/lib/confidence";
import { ZONE_MAP_VIEWS } from "@/lib/zoneMapViews";
import type { ZoneBrief } from "@/types/brief";
import styles from "./MapView.module.css";
import { PERIODS, periodCutoff, useZonePeriod } from "./ZonePeriod";
import legend from "./BriefMapView.module.css";

// Leaflet touche à `window` : la carte n'est jamais rendue côté serveur.
const BriefMap = dynamic(() => import("./BriefMap"), { ssr: false });

/** Carte d'actualités des zones « analyste » : les synthèses de l'analyste, géolocalisées. */
export default function BriefMapView({ briefs, zoneSlug }: { briefs: ZoneBrief[]; zoneSlug: string }) {
  // Même période que la liste des synthèses : la carte ne montre que ce que la liste affiche (7 derniers jours par défaut).
  const { period, now } = useZonePeriod();
  const cutoff = periodCutoff(period, now);
  const placed = briefs.filter(
    (b) =>
      b.latitude != null &&
      b.longitude != null &&
      (cutoff === null || (b.published_at !== null && new Date(b.published_at).getTime() >= cutoff)),
  );
  return (
    <div className={styles.container}>
      <div className={styles.mapWrapper}>
        <BriefMap briefs={placed} defaultView={ZONE_MAP_VIEWS[zoneSlug]} />
        <div className={styles.overlay}>
          <ul className={legend.legend} aria-label="Indice de confiance">
            {CONFIDENCE_LEVELS.map((l) => (
              <li key={l.label}>
                <i style={{ background: l.color }} />
                {l.label}
              </li>
            ))}
          </ul>
          <span className={styles.count}>
            {placed.length} article(s) sur la carte · {PERIODS.find((p) => p.value === period)?.label.toLowerCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
