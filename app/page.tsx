import Globe3DLoader from "@/components/equinoxe/Globe3DLoader";
import Header from "@/components/equinoxe/Header";
import HomeNewsColumn from "@/components/equinoxe/HomeNewsColumn";
import RiskLegend from "@/components/equinoxe/RiskLegend";
import Ticker from "@/components/equinoxe/Ticker";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <Header />
      <Ticker />

      <div className={styles.body}>
        <HomeNewsColumn />

        <div className={styles.globeColumn}>
          <div className={styles.mapArea}>
            <Globe3DLoader />
          </div>

          <div className={styles.legendBar}>
            <RiskLegend />
            <span className={styles.disclaimer}>
              Indicateur de tendance illustratif — cliquez sur une zone du menu pour une analyse
              détaillée
            </span>
          </div>
        </div>
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
