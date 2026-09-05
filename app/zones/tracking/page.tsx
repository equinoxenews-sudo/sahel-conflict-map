import Header from "@/components/equinoxe/Header";
import TrackingView from "@/components/equinoxe/TrackingView";
import styles from "./page.module.css";

export default function TrackingPage() {
  return (
    <main className={styles.main}>
      <Header />
      <div className={styles.topBar}>
        <h1 className={styles.title}>TRACKING</h1>
      </div>
      <TrackingView />
    </main>
  );
}
