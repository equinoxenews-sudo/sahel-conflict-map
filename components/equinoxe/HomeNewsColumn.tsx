import { HOME_NEWS } from "@/lib/homeNews";
import styles from "./HomeNewsColumn.module.css";

export default function HomeNewsColumn() {
  return (
    <div className={styles.column}>
      <h2 className={styles.heading}>Dernières infos</h2>
      <div className={styles.list}>
        {HOME_NEWS.map((item) => (
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
