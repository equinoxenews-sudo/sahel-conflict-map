"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDate } from "@/lib/formatDate";
import { HOME_NEWS } from "@/lib/homeNews";
import { computeBriefReliability, RELIABILITY_COLORS } from "@/lib/reliability";
import type { Article } from "@/types/article";
import type { ZoneBrief } from "@/types/brief";
import styles from "./HomeNewsColumn.module.css";

interface HomeNewsColumnProps {
  briefs: ZoneBrief[];
  articles: Article[];
}

type DateFilter = "day" | "week" | "month" | "all";

const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: "day", label: "24h" },
  { value: "week", label: "7 jours" },
  { value: "month", label: "30 jours" },
  { value: "all", label: "Tout" },
];

const FILTER_WINDOW_MS: Record<DateFilter, number | null> = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  all: null,
};

export default function HomeNewsColumn({ briefs, articles }: HomeNewsColumnProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  // Captured once per mount rather than read fresh inside useMemo (which
  // must stay a pure function of its deps) — a few minutes of staleness
  // for a "24h"/"7 jours" filter is immaterial.
  const [now] = useState(() => Date.now());
  const useBriefs = briefs.length > 0;
  const useRealArticles = !useBriefs && articles.length > 0;

  const filteredBriefs = useMemo(() => {
    const windowMs = FILTER_WINDOW_MS[dateFilter];
    if (windowMs === null) return briefs;
    const cutoff = now - windowMs;
    return briefs.filter((b) => (b.published_at ? new Date(b.published_at).getTime() >= cutoff : true));
  }, [briefs, dateFilter, now]);

  return (
    <div className={styles.column}>
      <div className={styles.headerRow}>
        <h2 className={styles.heading}>Dernières infos</h2>
        {useBriefs ? (
          <div className={styles.dateFilters}>
            {DATE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={dateFilter === f.value ? styles.dateFilterActive : styles.dateFilterBtn}
                onClick={() => setDateFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className={styles.list}>
        {useBriefs
          ? filteredBriefs.map((b) => {
              const reliability = computeBriefReliability(b.source_domains);
              return (
                <Link key={b.id} href={`/briefs/${b.id}`} className={styles.item}>
                  {b.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.image_url} alt="" className={styles.image} />
                  ) : null}
                  <div className={styles.itemBody}>
                    <div className={styles.header}>
                      <span className={styles.date}>{formatDate(b.published_at)}</span>
                      <span
                        className={styles.reliabilityBadge}
                        style={{ backgroundColor: RELIABILITY_COLORS[reliability] }}
                      >
                        {reliability}
                      </span>
                    </div>
                    <h3 className={styles.title}>{b.title}</h3>
                    <p className={styles.summary}>{b.summary}</p>
                  </div>
                </Link>
              );
            })
          : useRealArticles
            ? articles.map((a) => (
                <article key={a.url} className={styles.item}>
                  <div className={styles.itemBody}>
                    <span className={styles.date}>{formatDate(a.published_at)}</span>
                    <h3 className={styles.title}>
                      <a href={a.url} target="_blank" rel="noopener noreferrer">
                        {a.title}
                      </a>
                    </h3>
                    <p className={styles.summary}>Source : {a.domain}</p>
                  </div>
                </article>
              ))
            : HOME_NEWS.map((item) => (
                <article key={item.title} className={styles.item}>
                  <div className={styles.itemBody}>
                    <span className={styles.date}>{item.date}</span>
                    <h3 className={styles.title}>{item.title}</h3>
                    <p className={styles.summary}>{item.summary}</p>
                  </div>
                </article>
              ))}
        {useBriefs && filteredBriefs.length === 0 ? (
          <p className={styles.empty}>Aucune synthèse dans cette période.</p>
        ) : null}
      </div>
    </div>
  );
}
