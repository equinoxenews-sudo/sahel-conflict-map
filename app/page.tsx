import Header from "@/components/equinoxe/Header";
import RiskLegend from "@/components/equinoxe/RiskLegend";
import WorldMapLoader from "@/components/equinoxe/WorldMapLoader";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <Header />

      <p className={styles.tagline}>
        EQUINOXE News propose une analyse géopolitique indépendante de l&apos;actualité
        internationale, fondée sur l&apos;OSINT et l&apos;étude des grands enjeux stratégiques
        mondiaux.
      </p>

      <div className={styles.mapArea}>
        <WorldMapLoader />
      </div>

      <div className={styles.legendBar}>
        <RiskLegend />
        <span className={styles.disclaimer}>
          Indicateur de tendance illustratif — cliquez sur une zone du menu pour une analyse
          détaillée
        </span>
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
