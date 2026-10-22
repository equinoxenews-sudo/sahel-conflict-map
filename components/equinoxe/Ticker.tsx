import Link from "next/link";
import HexFlag from "@/components/investigation/HexFlag";
import { flagsInText } from "@/lib/flagMentions";
import { getTickerItems } from "@/lib/tickerItems";
import styles from "./Ticker.module.css";

// Drapeaux hexagonaux (comme dans les fiches Approche) des pays et organisations cités dans le titre,
// dans l'ordre : « Qatar–France » porte les deux, « Iran–ONU » celui de l'Iran et celui de l'ONU.
// Trois drapeaux au plus par titre ; ils précèdent le texte et défilent avec lui.
const MAX_FLAGS = 3;

/** Vitesse de lecture confortable du bandeau, en pixels par seconde. */
const SPEED_PX_PER_S = 55;
/** Largeur approximative d'un titre à l'écran (texte de 11 px, marges, drapeau, puce). */
const itemWidth = (title: string) => title.length * 6.2 + 90 + flagsInText(title, MAX_FLAGS).length * 20;

// Titres épinglés depuis le HQ et titres forts des analystes (lib/tickerItems.ts).
export default async function Ticker() {
  const news = (await getTickerItems()).map((item) => ({ ...item, flags: flagsInText(item.title, MAX_FLAGS) }));
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
                {item.flags.map((flag) => (
                  <span key={flag.iso2} className={styles.flag}>
                    <HexFlag iso2={flag.iso2} name={flag.name} />
                  </span>
                ))}
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
