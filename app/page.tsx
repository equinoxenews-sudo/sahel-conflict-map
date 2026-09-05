import MapView from "@/components/MapView";
import { supabase } from "@/lib/supabaseClient";
import type { ConflictEvent } from "@/types/event";
import styles from "./page.module.css";

export const revalidate = 3600;

async function getEvents(): Promise<ConflictEvent[]> {
  try {
    const { data, error } = await supabase
      .from("conflict_events")
      .select("*")
      .order("event_date", { ascending: false })
      .limit(5000);

    if (error) {
      console.error("Failed to load conflict_events:", error.message);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error("Failed to reach Supabase:", err);
    return [];
  }
}

export default async function Home() {
  const events = await getEvents();

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>Conflits au Sahel — Mali, Burkina Faso, Niger, Tchad</h1>
        <p className={styles.subtitle}>Données ACLED, 30 derniers jours</p>
      </header>
      <div className={styles.mapArea}>
        <MapView events={events} />
      </div>
    </main>
  );
}
