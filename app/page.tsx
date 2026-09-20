import GlobeWithLayers from "@/components/equinoxe/GlobeWithLayers";
import Header from "@/components/equinoxe/Header";
import HomeBody from "@/components/equinoxe/HomeBody";
import HomeNewsColumn from "@/components/equinoxe/HomeNewsColumn";
import Ticker from "@/components/equinoxe/Ticker";
import ZonesGrid from "@/components/equinoxe/ZonesGrid";
import { computeCountryRiskFromEvents } from "@/lib/computeCountryRisk";
import { fetchMilitaryAircraft } from "@/lib/layers/aircraft";
import { fetchEarthquakes } from "@/lib/layers/earthquakes";
import { fetchUpcomingLaunches } from "@/lib/layers/launches";
import { fetchNaturalEvents } from "@/lib/layers/naturalEvents";
import { fetchSatellitePositions } from "@/lib/layers/satellites";
import { supabase } from "@/lib/supabaseClient";
import type { Article } from "@/types/article";
import type { ZoneBrief } from "@/types/brief";
import type { VesselPosition } from "@/types/vessel";
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

export default async function Home() {
  const [countryRisk, briefs, gdeltStatus, vessels, aircraft, satellites, earthquakes, naturalEvents, launches] =
    await Promise.all([
      computeCountryRiskFromEvents(),
      getHomeBriefs(),
      getGdeltStatus(),
      getVesselPositions(),
      fetchMilitaryAircraft(),
      fetchSatellitePositions(),
      fetchEarthquakes(),
      fetchNaturalEvents(),
      fetchUpcomingLaunches(),
    ]);
  const articles = briefs.length === 0 ? await getHomeArticles() : [];

  const latestBrief = briefs[0];
  const latestArticle = articles[0];
  const latest = latestBrief
    ? {
        title: latestBrief.title,
        date: latestBrief.published_at,
        href: `/briefs/${latestBrief.id}`,
        imageUrl: latestBrief.image_url,
      }
    : latestArticle
      ? { title: latestArticle.title, date: latestArticle.published_at, href: latestArticle.url }
      : null;

  return (
    <main className={styles.main}>
      <Header />
      <Ticker />

      <HomeBody
        newsSlot={<HomeNewsColumn briefs={briefs} articles={articles} />}
        zonesSlot={<ZonesGrid />}
        latest={latest}
        globeSlot={
          <GlobeWithLayers
            countryRisk={countryRisk}
            aircraft={aircraft}
            satellites={satellites}
            vessels={vessels}
            earthquakes={earthquakes}
            naturalEvents={naturalEvents}
            launches={launches}
            gdeltStatus={gdeltStatus}
          />
        }
      />

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
