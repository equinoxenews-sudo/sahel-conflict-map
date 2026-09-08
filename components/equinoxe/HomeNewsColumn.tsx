import { formatDate } from "@/lib/formatDate";
import { HOME_NEWS } from "@/lib/homeNews";
import type { Article } from "@/types/article";
import styles from "./HomeNewsColumn.module.css";

interface HomeNewsColumnProps {
  articles: Article[];
}

export default function HomeNewsColumn({ articles }: HomeNewsColumnProps) {
  const useRealArticles = articles.length > 0;

  return (
    <div className={styles.column}>
      <h2 className={styles.heading}>Dernières infos</h2>
      <div className={styles.list}>
        {useRealArticles
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
