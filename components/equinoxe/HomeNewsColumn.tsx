import Link from "next/link";
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

export default function HomeNewsColumn({ briefs, articles }: HomeNewsColumnProps) {
  const useBriefs = briefs.length > 0;
  const useRealArticles = !useBriefs && articles.length > 0;

  return (
    <div className={styles.column}>
      <h2 className={styles.heading}>Dernières infos</h2>
      <div className={styles.list}>
        {useBriefs
          ? briefs.map((b) => {
              const reliability = computeBriefReliability(b.source_domains);
              return (
                <Link key={b.id} href={`/briefs/${b.id}`} className={styles.item}>
                  {b.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.image_url} alt="" className={styles.image} />
                  ) : null}
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
                  <p className={styles.sources}>Sources : {[...new Set(b.source_domains)].join(", ")}</p>
                </Link>
              );
            })
          : useRealArticles
            ? articles.map((a) => (
                <article key={a.url} className={styles.item}>
                  <span className={styles.date}>{formatDate(a.published_at)}</span>
                  <h3 className={styles.title}>
                    <a href={a.url} target="_blank" rel="noopener noreferrer">
                      {a.title}
                    </a>
                  </h3>
                  <p className={styles.summary}>Source : {a.domain}</p>
                </article>
              ))
            : HOME_NEWS.map((item) => (
                <article key={item.title} className={styles.item}>
                  <span className={styles.date}>{item.date}</span>
                  <h3 className={styles.title}>{item.title}</h3>
                  <p className={styles.summary}>{item.summary}</p>
                </article>
              ))}
      </div>
    </div>
  );
}
