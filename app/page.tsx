import FeedColumn from "@/components/equinoxe/FeedColumn";
import Globe3DLoader from "@/components/equinoxe/Globe3DLoader";
import Header from "@/components/equinoxe/Header";
import HomeNewsColumn from "@/components/equinoxe/HomeNewsColumn";
import RiskLegend from "@/components/equinoxe/RiskLegend";
import Ticker from "@/components/equinoxe/Ticker";
import { computeCountryRiskFromEvents } from "@/lib/computeCountryRisk";
import styles from "./page.module.css";

export const revalidate = 3600;

export default async function Home() {
  const countryRisk = await computeCountryRiskFromEvents();

  return (
    <main className={styles.main}>
      <Header />
      <Ticker />

      <div className={styles.body}>
        <HomeNewsColumn />

        <div className={styles.globeColumn}>
          <div className={styles.mapArea}>
            <Globe3DLoader countryRisk={countryRisk} />
          </div>

          <div className={styles.legendBar}>
            <RiskLegend />
            <span className={styles.disclaimer}>
              Calculé à partir des événements recensés sur chaque zone (90 derniers jours) —
              cliquez sur une zone du menu pour une analyse détaillée
            </span>
          </div>
        </div>

        <FeedColumn />
      </div>

      <footer className={styles.footer}>
        <a href="#" aria-label="Instagram">
          IG
        </a>
        <a href="#" aria-label="X">
          X
        </a>
      </footer>
    </main>
  );
}
