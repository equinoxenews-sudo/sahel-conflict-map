"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDate } from "@/lib/formatDate";
import { computeCoverageScore, coverageColor } from "@/lib/reliability";
import type { NewsItem } from "@/lib/africaNews";
import type { Article } from "@/types/article";
import type { ZoneBrief } from "@/types/brief";
import styles from "./ZoneNewsList.module.css";

// Same categories used for map event markers (types/event.ts) — reusing
// them lets one thematic filter apply to both the map and this list.
const CATEGORIES = [
  "Battles",
  "Explosions/Remote violence",
  "Violence against civilians",
  "Protests",
  "Riots",
  "Strategic developments",
] as const;

interface ZoneNewsListProps {
  briefs: ZoneBrief[];
  articles: Article[];
  newsItems: NewsItem[];
}

export default function ZoneNewsList({ briefs, articles, newsItems }: ZoneNewsListProps) {
  const [category, setCategory] = useState<string>("all");
  const useBriefs = briefs.length > 0;
  const useRealArticles = !useBriefs && articles.length > 0;

  const presentCategories = useMemo(
    () => CATEGORIES.filter((c) => briefs.some((b) => b.category === c)),
    [briefs]
  );

  const filteredBriefs = useMemo(
    () => (category === "all" ? briefs : briefs.filter((b) => b.category === category)),
    [briefs, category]
  );

  return (
    <div className={styles.container}>
      {useBriefs && presentCategories.length > 1 ? (
        <div className={styles.filterRow}>
          <label className={styles.filterLabel} htmlFor="zone-news-category">
            Catégorie
          </label>
          <select
            id="zone-news-category"
            className={styles.filterSelect}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">Tout</option>
            {presentCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className={styles.list}>
        {useBriefs
          ? filteredBriefs.map((b) => {
              const coverage = computeCoverageScore(b.source_domains);
              return (
                <Link key={b.id} href={`/briefs/${b.id}`} className={styles.newsItem}>
                  {b.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.image_url} alt="" className={styles.newsImage} />
                  ) : null}
                  <div className={styles.newsItemBody}>
                    <div className={styles.newsHeader}>
                      <span className={styles.newsDate}>{formatDate(b.published_at)}</span>
                      <span
                        className={styles.reliabilityBadge}
                        title={`Couverture documentaire : ${coverage} source${coverage > 1 ? "s" : ""} citée${coverage > 1 ? "s" : ""}, indépendance non vérifiée`}
                        aria-label={`Couverture documentaire : ${coverage} source${coverage > 1 ? "s" : ""}`}
                        style={{ backgroundColor: coverageColor(coverage) }}
                      >
                        {coverage}
                      </span>
                    </div>
                    <h2 className={styles.newsTitle}>{b.title}</h2>
                    <p className={styles.newsSummary}>{b.summary}</p>
                  </div>
                </Link>
              );
            })
          : useRealArticles
            ? articles.map((a) => (
                <article key={a.url} className={styles.newsItem}>
                  <div className={styles.newsItemBody}>
                    <span className={styles.newsDate}>{formatDate(a.published_at)}</span>
                    <h2 className={styles.newsTitle}>
                      <a href={a.url} target="_blank" rel="noopener noreferrer">
                        {a.title}
                      </a>
                    </h2>
                    <p className={styles.newsSummary}>Source : {a.domain}</p>
                  </div>
                </article>
              ))
            : newsItems.map((item) => (
                <article key={item.title} className={styles.newsItem}>
                  <div className={styles.newsItemBody}>
                    <span className={styles.newsDate}>{item.date}</span>
                    <h2 className={styles.newsTitle}>{item.title}</h2>
                    <p className={styles.newsSummary}>{item.summary}</p>
                  </div>
                </article>
              ))}
        {useBriefs && filteredBriefs.length === 0 ? (
          <p className={styles.empty}>Aucun article dans cette catégorie.</p>
        ) : null}
      </div>
    </div>
  );
}
