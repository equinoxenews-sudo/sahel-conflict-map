import { HOME_NEWS } from "@/lib/homeNews";
import styles from "./Ticker.module.css";

export default function Ticker() {
  // duplicate the list so the CSS loop (translateX -50%) is seamless
  const items = [...HOME_NEWS, ...HOME_NEWS];

  return (
    <div className={styles.ticker}>
      <span className={styles.badge}>LATEST</span>
      <div className={styles.trackWrapper}>
        <div className={styles.track}>
          {items.map((item, i) => (
            <span key={`${item.title}-${i}`} className={styles.item}>
              {item.title}
              <span className={styles.dot}>•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
