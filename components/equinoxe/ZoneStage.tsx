"use client";

import type { CSSProperties } from "react";
import type { ZoneBriefCard, ZoneSlug } from "@/lib/homeZones";
import styles from "./ZoneStage.module.css";
import ZoneCarousel from "./ZoneCarousel";
import ZonePanel from "./ZonePanel";

interface ZoneStageProps {
  zone: ZoneSlug;
  briefs: ZoneBriefCard[];
  onClose: () => void;
}

// Fiche de zone (à gauche) et carrousel des derniers articles (en bas), par-dessus le globe
// de l'accueil. Les positions viennent de variables CSS : la fiche occupe la place de
// l'ancienne colonne « Dernières infos », le carrousel s'arrête avant la colonne des couches.
const POSITIONS = {
  "--zone-panel-left": "16px",
  "--zone-panel-top": "16px",
  "--zone-panel-max-height": "calc(100% - 16px - 290px)",
  "--zone-dock-left": "398px",
  "--zone-dock-right": "432px",
  "--zone-dock-bottom": "92px",
} as CSSProperties;

export default function ZoneStage({ zone, briefs, onClose }: ZoneStageProps) {
  return (
    <div className={styles.stage} style={POSITIONS}>
      <ZonePanel zone={zone} briefs={briefs} onClose={onClose} />
      <ZoneCarousel key={zone} zone={zone} briefs={briefs} variant="dock" />
    </div>
  );
}
