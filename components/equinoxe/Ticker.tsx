import Link from "next/link";
import HexFlag from "@/components/investigation/HexFlag";
import { findCountryByLabel } from "@/lib/countries";
import { getTickerItems } from "@/lib/tickerItems";
import styles from "./Ticker.module.css";

// Le titre commence par le lieu (« Soudan — poursuite des combats… ») : s'il s'agit d'un pays
// connu, son drapeau hexagonal (comme dans les fiches Approche) précède le texte et défile avec lui.
function flagFor(title: string) {
  const place = title.split(" — ")[0]?.trim();
  return place ? findCountryByLabel(place) : null;
}

// Titres épinglés depuis le HQ et titres forts des analystes (lib/tickerItems.ts).
export default async function Ticker() {
  const news = (await getTickerItems()).map((item) => ({ ...item, flag: flagFor(item.title) }));
  // duplicate the list so the CSS loop (translateX -50%) is seamless
  const items = [...news, ...news];

  return (
    <div className={styles.ticker} data-intro-hide>
      <span className={styles.badge}>LATEST</span>
      <div className={styles.trackWrapper}>
        <div className={styles.track}>
          {items.map((item, i) => {
            const content = (
              <>
                {item.flag ? (
                  <span className={styles.flag}>
                    <HexFlag iso2={item.flag.iso2} name={item.flag.name} />
                  </span>
                ) : null}
                {item.title}
                <span className={styles.dot}>•</span>
              </>
            );
            return item.href ? (
              <Link key={`${item.title}-${i}`} href={item.href} className={`${styles.item} ${styles.link}`} target={item.href.startsWith("http") ? "_blank" : undefined}>
                {content}
              </Link>
            ) : (
              <span key={`${item.title}-${i}`} className={styles.item}>
                {content}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
