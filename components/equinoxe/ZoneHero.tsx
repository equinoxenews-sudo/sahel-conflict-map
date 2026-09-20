import Image from "next/image";
import Link from "next/link";
import { getZoneHeroImage } from "@/lib/zoneHeroImages";
import type { ZoneHubContent } from "@/lib/zoneHubContent";
import type { Zone } from "@/lib/zones";
import styles from "./ZoneHero.module.css";

interface ZoneHeroProps {
  zone: Zone;
  content?: ZoneHubContent;
}

export default function ZoneHero({ zone, content }: ZoneHeroProps) {
  const description =
    content?.description ??
    (zone.active
      ? "Contexte régional, actualité et analyses géopolitiques."
      : "Contenu en cours de constitution pour cette zone — revenez bientôt.");
  const heroImage = getZoneHeroImage(zone.slug);

  return (
    <section className={styles.hero}>
      {heroImage ? (
        <div className={styles.imageWrap}>
          <Image src={heroImage} alt="" fill className={styles.bgImage} priority sizes="60vw" />
        </div>
      ) : null}
      <div className={styles.overlay} aria-hidden />
      <div className={styles.inner}>
        <div className={styles.left}>
          <nav className={styles.breadcrumb} aria-label="Fil d'ariane">
            <Link href="/">Accueil</Link>
            <span aria-hidden>›</span>
            <span>{zone.name}</span>
          </nav>

          <div className={styles.identity}>
            <Link href="/" className={styles.mobileBack} aria-label="Retour à l'accueil">
              ‹
            </Link>
            <span className={styles.iconWrap}>
              <Image src={zone.icon} alt={zone.name} width={44} height={54} />
            </span>
            <div>
              <h1 className={styles.title}>{zone.name.toUpperCase()}</h1>
              <p className={styles.description}>{description}</p>
            </div>
          </div>

          {content?.stats ? (
            <div className={styles.stats}>
              {content.stats.map((stat) => (
                <div key={stat.label} className={styles.stat}>
                  <span className={styles.statIcon} aria-hidden>
                    {stat.icon}
                  </span>
                  <div className={styles.statText}>
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {content?.quote ? (
          <div className={styles.quote}>
            <p className={styles.quoteText}>« {content.quote.text} »</p>
            <span className={styles.quoteBar} aria-hidden />
            <p className={styles.quoteBody}>{content.quote.body}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
