import Image from "next/image";
import { displayable } from "@/lib/approche/media";
import type { MediaAsset } from "@/lib/approche/modules";
import Icon from "./Icon";
import styles from "./Approche.module.css";

export type MediaMap = Record<string, MediaAsset>;

interface VisualProps {
  asset: MediaAsset | null | undefined;
  demoActive: boolean;
  /** Pictogramme du visuel neutre de remplacement. */
  icon: string;
  /** Teinte du visuel neutre (0-360). */
  hue?: number;
  /** Légende de crédit sous l'image. */
  caption?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
}

// Zone visuelle d'une carte ou d'un bandeau : la photographie quand elle existe et que sa licence le permet, sinon un visuel neutre
// élégant (dégradé et pictogramme). Jamais une image « inventée » : le crédit de l'image figure toujours dans sa légende.
export default function Visual({ asset, demoActive, icon, hue = 215, caption = false, priority = false, sizes = "(max-width: 860px) 100vw, 33vw", className }: VisualProps) {
  if (displayable(asset, demoActive)) {
    return (
      <div className={`${styles.visual} ${className ?? ""}`}>
        <Image src={asset.path} alt={asset.alt} fill sizes={sizes} priority={priority} style={{ objectFit: "cover", objectPosition: `${asset.focal.x}% ${asset.focal.y}%` }} />
        {caption && (asset.credit || asset.author) ? <span className={styles.visualCredit}>{asset.credit ?? asset.author}</span> : null}
      </div>
    );
  }
  return (
    <div className={`${styles.visual} ${styles.visualFallback} ${className ?? ""}`} style={{ background: `linear-gradient(135deg, hsl(${hue} 45% 16%) 0%, hsl(${(hue + 25) % 360} 50% 10%) 100%)` }} aria-hidden>
      <Icon name={icon} size={44} />
    </div>
  );
}
