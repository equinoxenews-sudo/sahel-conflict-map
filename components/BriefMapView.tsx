"use client";

import dynamic from "next/dynamic";
import { CONFIDENCE_LEVELS } from "@/lib/confidence";
import { ZONE_MAP_VIEWS } from "@/lib/zoneMapViews";
import type { ZoneBrief } from "@/types/brief";
import styles from "./MapView.module.css";
import legend from "./BriefMapView.module.css";

// Leaflet touche à `window` : la carte n'est jamais rendue côté serveur.
const BriefMap = dynamic(() => import("./BriefMap"), { ssr: false });

/** Carte d'actualités des zones « analyste » : les synthèses de l'analyste, géolocalisées. */
export default function BriefMapView({ briefs, zoneSlug }: { briefs: ZoneBrief[]; zoneSlug: string }) {
  const placed = briefs.filter((b) => b.latitude != null && b.longitude != null);
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
            {placed.length} article(s) sur la carte
          </span>
        </div>
      </div>
    </div>
  );
}
