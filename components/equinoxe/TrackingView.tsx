"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { VesselPosition } from "@/types/vessel";
import styles from "./TrackingView.module.css";

const LiveAircraftMap = dynamic(() => import("./LiveAircraftMap"), { ssr: false });
const VesselMap = dynamic(() => import("./VesselMap"), { ssr: false });

type Source = "maritime" | "air";

const MARINETRAFFIC_URL =
  "https://www.marinetraffic.com/en/ais/embed/zoom:3/centery:15/centerx:10/maptype:0/shownames:false/mmsi:0/shipid:0/fleet:/fleet_id:/vtypes:/showmenu:false/remember:false";

interface TrackingViewProps {
  vessels: VesselPosition[];
}

export default function TrackingView({ vessels }: TrackingViewProps) {
  const [source, setSource] = useState<Source>("maritime");
  const hasVessels = vessels.length > 0;

  return (
    <div className={styles.container}>
      <div className={styles.newsList}>
        <article className={styles.newsItem}>
          <h2 className={styles.newsTitle}>Contenu à venir</h2>
          <p className={styles.newsSummary}>
            Cette colonne accueillera une sélection d&apos;informations liées au trafic
            maritime et aérien (routes à risque, incidents, zones de tension).
          </p>
        </article>
      </div>

      <div className={styles.mapArea}>
        <div className={styles.toggle}>
          <button
            type="button"
            className={source === "maritime" ? styles.activeBtn : styles.btn}
            onClick={() => setSource("maritime")}
          >
            Maritime {hasVessels ? "— points stratégiques" : "— MarineTraffic"}
          </button>
          <button
            type="button"
            className={source === "air" ? styles.activeBtn : styles.btn}
            onClick={() => setSource("air")}
          >
            Aérien — en direct (OpenSky)
          </button>
        </div>
        <div className={styles.iframeWrapper}>
          {source === "maritime" ? (
            hasVessels ? (
              <VesselMap vessels={vessels} />
            ) : (
              <iframe
                key="maritime"
                title="MarineTraffic"
                src={MARINETRAFFIC_URL}
                className={styles.iframe}
              />
            )
          ) : (
            <LiveAircraftMap />
          )}
        </div>
      </div>
    </div>
  );
}
