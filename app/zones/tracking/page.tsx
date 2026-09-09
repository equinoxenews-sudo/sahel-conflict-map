import Header from "@/components/equinoxe/Header";
import TrackingView from "@/components/equinoxe/TrackingView";
import { supabase } from "@/lib/supabaseClient";
import type { VesselPosition } from "@/types/vessel";
import styles from "./page.module.css";

export const revalidate = 3600;

async function getVesselPositions(): Promise<VesselPosition[]> {
  try {
    const { data, error } = await supabase
      .from("vessel_positions")
      .select("mmsi, ship_name, latitude, longitude, speed, course, region, updated_at")
      .order("updated_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Failed to load vessel_positions:", error.message);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error("Failed to reach Supabase:", err);
    return [];
  }
}

export default async function TrackingPage() {
  const vessels = await getVesselPositions();

  return (
    <main className={styles.main}>
      <Header />
      <div className={styles.topBar}>
        <h1 className={styles.title}>TRACKING</h1>
      </div>
      <TrackingView vessels={vessels} />
    </main>
  );
}
