import Header from "@/components/equinoxe/Header";
import MonEspaceView from "@/components/monespace/MonEspaceView";
import styles from "./page.module.css";

export default function MonEspacePage() {
  return (
    <main className={styles.main}>
      <Header />
      <MonEspaceView />
    </main>
  );
}
