import HexFlag from "@/components/investigation/HexFlag";
import { findCountryByLabel } from "@/lib/countries";
import { HOME_NEWS } from "@/lib/homeNews";
import styles from "./Ticker.module.css";

// Le titre commence par le lieu (« Soudan — poursuite des combats… ») : s'il s'agit d'un pays
// connu, son drapeau hexagonal (comme dans les fiches Approche) précède le texte et défile avec lui.
function flagFor(title: string) {
  const place = title.split(" — ")[0]?.trim();
  return place ? findCountryByLabel(place) : null;
}

export default function Ticker() {
  const news = HOME_NEWS.map((item) => ({ title: item.title, flag: flagFor(item.title) }));
  // duplicate the list so the CSS loop (translateX -50%) is seamless
  const items = [...news, ...news];

  return (
    <div className={styles.ticker} data-intro-hide>
      <span className={styles.badge}>LATEST</span>
      <div className={styles.trackWrapper}>
        <div className={styles.track}>
          {items.map((item, i) => (
            <span key={`${item.title}-${i}`} className={styles.item}>
              {item.flag ? (
                <span className={styles.flag}>
                  <HexFlag iso2={item.flag.iso2} name={item.flag.name} />
                </span>
              ) : null}
              {item.title}
              <span className={styles.dot}>•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
