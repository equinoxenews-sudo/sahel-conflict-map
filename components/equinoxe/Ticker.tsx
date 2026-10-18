import Link from "next/link";
import HexFlag from "@/components/investigation/HexFlag";
import { findCountryByLabel } from "@/lib/countries";
import { getTickerItems } from "@/lib/tickerItems";
import styles from "./Ticker.module.css";

// Le titre commence par le lieu (« Soudan — poursuite des combats… », « Tunisie : manifestation… ») :
// s'il s'agit d'un pays connu, son drapeau hexagonal (comme dans les fiches Approche) précède le
// texte et défile avec lui. Deux pays liés (« Iran-États-Unis ») : drapeau du premier.
function flagFor(title: string) {
  const place = title.split(/\s+[—:]\s+/)[0]?.trim();
  if (!place) return null;
  const parts = place.split(/\s*[-–/]\s*/);
  // « Royaume-Uni », « Guinée-Bissau » : on essaie d'abord les noms composés, du plus long au plus court.
  for (let n = parts.length; n >= 1; n--) {
    const found = findCountryByLabel(parts.slice(0, n).join("-"));
    if (found) return found;
  }
  return null;
}

/** Vitesse de lecture confortable du bandeau, en pixels par seconde. */
const SPEED_PX_PER_S = 60;
/** Largeur approximative d'un titre à l'écran (texte de 11 px, marges, drapeau, puce). */
const itemWidth = (title: string) => title.length * 6.2 + 90;

// Titres épinglés depuis le HQ et titres forts des analystes (lib/tickerItems.ts).
export default async function Ticker() {
  const news = (await getTickerItems()).map((item) => ({ ...item, flag: flagFor(item.title) }));
  // duplicate the list so the CSS loop (translateX -50%) is seamless
  const items = [...news, ...news];
  // Durée d'un tour proportionnelle à la longueur des titres : même vitesse quel que soit leur nombre.
  const duration = Math.max(30, Math.round(news.reduce((sum, n) => sum + itemWidth(n.title), 0) / SPEED_PX_PER_S));

  return (
    <div className={styles.ticker} data-intro-hide>
      <span className={styles.badge}>LATEST</span>
      <div className={styles.trackWrapper}>
        <div className={styles.track} style={{ animationDuration: `${duration}s` }}>
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
