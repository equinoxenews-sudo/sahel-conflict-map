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

// Bandeau d'ouverture d'un onglet : photographie quand une image à licence confirmée existe (ou en démonstration), sinon visuel
// neutre. Le texte décrit la rubrique, jamais un chiffre.
export default function TabBanner({ title, subtitle, icon, asset, demoActive, hue }: TabBannerProps) {
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
