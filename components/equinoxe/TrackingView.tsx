"use client";

import { useState } from "react";
import styles from "./TrackingView.module.css";

type Source = "maritime" | "air";

const MARINETRAFFIC_URL =
  "https://www.marinetraffic.com/en/ais/embed/zoom:3/centery:15/centerx:10/maptype:0/shownames:false/mmsi:0/shipid:0/fleet:/fleet_id:/vtypes:/showmenu:false/remember:false";

const ADSBEXCHANGE_URL = "https://globe.adsbexchange.com/?lat=20&lon=15&zoom=2";

export default function TrackingView() {
  const [source, setSource] = useState<Source>("maritime");

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
            Maritime — MarineTraffic
          </button>
          <button
            type="button"
            className={source === "air" ? styles.activeBtn : styles.btn}
            onClick={() => setSource("air")}
          >
            Aérien — ADS-B Exchange
          </button>
        </div>
        <div className={styles.iframeWrapper}>
          {source === "maritime" ? (
            <iframe
              key="maritime"
              title="MarineTraffic"
              src={MARINETRAFFIC_URL}
              className={styles.iframe}
            />
          ) : (
            <iframe
              key="air"
              title="ADS-B Exchange"
              src={ADSBEXCHANGE_URL}
              className={styles.iframe}
            />
          )}
        </div>
      </div>
    </div>
  );
}
