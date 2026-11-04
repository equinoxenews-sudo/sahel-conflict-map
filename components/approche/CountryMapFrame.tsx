"use client";

import { useEffect, useRef, useState } from "react";
import CountryMap, { type CountryMapData } from "@/components/country-profile/CountryMap";
import Icon from "./Icon";
import { useFullscreenSupport } from "./useFullscreenSupport";
import styles from "./Approche.module.css";

// Carte du pays (contours, voisins, villes dont la capitale) avec recentrage et plein écran. La carte elle-même est celle des fiches
// pays existantes (Leaflet, fond satellite Esri) ; seul le cadre et ses commandes sont ajoutés ici.
export default function CountryMapFrame({ data, height = 460 }: { data: CountryMapData; height?: number }) {
  const frame = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const canFullscreen = useFullscreenSupport();
  const [resetToken, setResetToken] = useState(0);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === frame.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await frame.current?.requestFullscreen?.();
    } catch {
      // Plein écran refusé par le navigateur (permission, iframe) : la carte reste affichée normalement.
    }
  }


  return (
    <div ref={frame} className={fullscreen ? `${styles.mapFrame} ${styles.mapFull}` : styles.mapFrame} style={fullscreen ? undefined : { height }}>
      <CountryMap data={data} resetToken={resetToken} />
      <div className={styles.mapControls}>
        <button type="button" className={styles.mapButton} onClick={() => setResetToken((value) => value + 1)} aria-label="Recentrer sur le pays" title="Recentrer sur le pays">
          <Icon name="target" size={16} />
        </button>
        {canFullscreen ? (
          <button type="button" className={styles.mapButton} onClick={() => void toggleFullscreen()} aria-label={fullscreen ? "Quitter le plein écran" : "Afficher la carte en plein écran"} title={fullscreen ? "Quitter le plein écran" : "Plein écran"}>
            <Icon name={fullscreen ? "check" : "map"} size={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
