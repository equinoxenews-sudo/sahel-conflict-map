import { displayable } from "@/lib/approche/media";
import type { MediaAsset } from "@/lib/approche/modules";
import Icon from "./Icon";
import Visual from "./Visual";
import styles from "./Approche.module.css";

interface TabBannerProps {
  title: string;
  subtitle: string;
  icon: string;
  asset?: MediaAsset | null;
  demoActive: boolean;
  hue?: number;
}

// Bandeau d'ouverture d'un onglet. Avec une photographie autorisée (ou en démonstration) : grand bandeau image. Sans photographie :
// bandeau compact (pictogramme, titre, sous-titre), jamais une grande surface vide. Le texte décrit la rubrique, jamais un chiffre.
export default function TabBanner({ title, subtitle, icon, asset, demoActive, hue = 215 }: TabBannerProps) {
  if (!displayable(asset, demoActive)) {
    return (
      <section className={styles.bannerCompact} aria-label={title} style={{ background: `linear-gradient(100deg, hsl(${hue} 42% 15%) 0%, hsl(${(hue + 25) % 360} 45% 10%) 100%)` }}>
        <span className={styles.bannerCompactIcon} style={{ color: `hsl(${hue} 75% 72%)` }} aria-hidden>
          <Icon name={icon} size={24} />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </section>
    );
  }
  return (
    <section className={styles.banner} aria-label={title}>
      <Visual asset={asset} demoActive={demoActive} icon={icon} hue={hue} caption className={styles.bannerImage} sizes="100vw" />
      <div className={styles.bannerShade} aria-hidden />
      <div className={styles.bannerText}>
        <Icon name={icon} size={22} />
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
    </section>
  );
}
