import FeedColumn from "@/components/equinoxe/FeedColumn";
import Globe3DLoader from "@/components/equinoxe/Globe3DLoader";
import Header from "@/components/equinoxe/Header";
import HomeNewsColumn from "@/components/equinoxe/HomeNewsColumn";
import RiskLegend from "@/components/equinoxe/RiskLegend";
import Ticker from "@/components/equinoxe/Ticker";
import { computeCountryRiskFromEvents } from "@/lib/computeCountryRisk";
import { supabase } from "@/lib/supabaseClient";
import type { Article } from "@/types/article";
import type { ZoneBrief } from "@/types/brief";
import styles from "./page.module.css";

export const revalidate = 3600;

async function getHomeBriefs(): Promise<ZoneBrief[]> {
  try {
    const { data, error } = await supabase
      .from("zone_briefs")
      .select(
        "id, zone_slug, title, category, summary, source_urls, source_domains, image_url, published_at"
      )
      .order("published_at", { ascending: false })
      .limit(8);

    if (error) {
      console.error("Failed to load home briefs:", error.message);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error("Failed to reach Supabase:", err);
    return [];
  }
}

const STALE_AFTER_HOURS = 48;

async function getGdeltStatus(): Promise<{ hoursSinceSuccess: number | null; stale: boolean }> {
  try {
    const { data } = await supabase
      .from("sync_status")
      .select("last_success_at")
      .eq("source", "gdelt")
      .maybeSingle();

    if (!data?.last_success_at) return { hoursSinceSuccess: null, stale: false };

    const hours = (Date.now() - new Date(data.last_success_at).getTime()) / (1000 * 60 * 60);
    return { hoursSinceSuccess: hours, stale: hours > STALE_AFTER_HOURS };
  } catch (err) {
    console.error("Failed to reach Supabase:", err);
    return { hoursSinceSuccess: null, stale: false };
  }
}

async function getHomeArticles(): Promise<Article[]> {
  try {
    const { data, error } = await supabase
      .from("articles")
      .select("title, url, domain, published_at")
      .order("published_at", { ascending: false })
      .limit(8);

    if (error) {
      console.error("Failed to load home articles:", error.message);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error("Failed to reach Supabase:", err);
    return [];
  }
}

export default async function Home() {
  const [countryRisk, briefs, gdeltStatus] = await Promise.all([
    computeCountryRiskFromEvents(),
    getHomeBriefs(),
    getGdeltStatus(),
  ]);
  const articles = briefs.length === 0 ? await getHomeArticles() : [];

  return (
    <main className={styles.main}>
      <Header />
      <Ticker />

      <div className={styles.body}>
        <HomeNewsColumn briefs={briefs} articles={articles} />

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
            {gdeltStatus.stale && gdeltStatus.hoursSinceSuccess != null ? (
              <span className={styles.staleWarning}>
                ⚠ Données non rafraîchies depuis {Math.floor(gdeltStatus.hoursSinceSuccess)}h
              </span>
            ) : null}
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
