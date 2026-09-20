"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { NewsItem } from "@/lib/africaNews";
import { formatDate } from "@/lib/formatDate";
import { computeBriefReliability, RELIABILITY_COLORS } from "@/lib/reliability";
import { EVENT_CATEGORIES } from "@/types/event";
import type { Article } from "@/types/article";
import type { ZoneBrief } from "@/types/brief";
import styles from "./ZoneNewsPanel.module.css";

const MAX_ITEMS = 5;

interface ZoneNewsPanelProps {
  zoneSlug: string;
  zoneName: string;
  briefs: ZoneBrief[];
  articles: Article[];
  newsItems: NewsItem[];
}

export default function ZoneNewsPanel({ zoneSlug, zoneName, briefs, articles, newsItems }: ZoneNewsPanelProps) {
  const [category, setCategory] = useState<string>("all");
  const useBriefs = briefs.length > 0;
  const useRealArticles = !useBriefs && articles.length > 0;
  const useCuratedNews = !useBriefs && !useRealArticles && newsItems.length > 0;

  const presentCategories = useMemo(
    () => EVENT_CATEGORIES.filter((c) => briefs.some((b) => b.category === c)),
    [briefs]
  );

  const filteredBriefs = useMemo(
    () => (category === "all" ? briefs : briefs.filter((b) => b.category === category)).slice(0, MAX_ITEMS),
    [briefs, category]
  );

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.heading}>
          <span className={styles.headingIcon} aria-hidden>
            <IconNewspaper />
          </span>
          Actualités {zoneName}
        </h2>
        <Link href={`/zones/${zoneSlug}/actualite`} className={styles.seeAll}>
          Voir tout →
        </Link>
      </div>
      <p className={styles.subtitle}>Les derniers événements sur le continent</p>

      {useBriefs && presentCategories.length > 1 ? (
        <div className={styles.filters}>
          <button
            type="button"
            className={category === "all" ? styles.filterActive : styles.filterBtn}
            onClick={() => setCategory("all")}
          >
            Toutes
          </button>
          {presentCategories.map((c) => (
            <button
              key={c}
              type="button"
              className={category === c ? styles.filterActive : styles.filterBtn}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      ) : null}

      <div className={styles.list}>
        {useBriefs
          ? filteredBriefs.map((b) => {
              const reliability = computeBriefReliability(b.source_domains);
              return (
                <Link key={b.id} href={`/briefs/${b.id}`} className={styles.item}>
                  <span
                    className={styles.dot}
                    style={{ backgroundColor: RELIABILITY_COLORS[reliability] }}
                    aria-hidden
                  />
                  <div className={styles.itemBody}>
                    <span className={styles.date}>{formatDate(b.published_at)}</span>
                    <h3 className={styles.title}>{b.title}</h3>
                    {b.category ? <span className={styles.tag}>#{b.category}</span> : null}
                  </div>
                  {b.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.image_url} alt="" className={styles.image} />
                  ) : null}
                </Link>
              );
            })
          : useRealArticles
            ? articles.slice(0, MAX_ITEMS).map((a) => (
                <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer" className={styles.item}>
                  <span className={styles.dot} aria-hidden />
                  <div className={styles.itemBody}>
                    <span className={styles.date}>{formatDate(a.published_at)}</span>
                    <h3 className={styles.title}>{a.title}</h3>
                    <span className={styles.tag}>{a.domain}</span>
                  </div>
                </a>
              ))
            : useCuratedNews
              ? newsItems.slice(0, MAX_ITEMS).map((item) => (
                  <div key={item.title} className={styles.item}>
                    <span className={styles.dot} aria-hidden />
                    <div className={styles.itemBody}>
                      <span className={styles.date}>{item.date}</span>
                      <h3 className={styles.title}>{item.title}</h3>
                    </div>
                  </div>
                ))
              : null}

        {useBriefs && filteredBriefs.length === 0 ? (
          <p className={styles.empty}>Aucune actualité récente disponible.</p>
        ) : null}
        {!useBriefs && !useRealArticles && !useCuratedNews ? (
          <p className={styles.empty}>Aucune actualité récente disponible.</p>
        ) : null}
      </div>

      {useBriefs ? (
        <Link href={`/zones/${zoneSlug}/actualite`} className={styles.footerLink}>
          Voir toutes les actualités →
        </Link>
      ) : null}
    </div>
  );
}

function IconNewspaper() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <path d="M7 8.5h6M7 12h10M7 15.5h10" />
    </svg>
  );
}
