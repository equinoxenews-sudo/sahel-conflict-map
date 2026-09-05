import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/equinoxe/Header";
import { getZone, TABS, TAB_LABELS } from "@/lib/zones";
import styles from "./page.module.css";

export default async function ZonePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const zone = getZone(slug);
  if (!zone) notFound();

  return (
    <main className={styles.main}>
      <Header />

      <div className={styles.hero}>
        <span className={styles.hex}>
          <Image src={zone.icon} alt={zone.name} width={70} height={86} />
        </span>
        <h1 className={styles.title}>{zone.name.toUpperCase()}</h1>
      </div>

      {!zone.active && (
        <p className={styles.notice}>
          Contenu en cours de constitution pour cette zone — revenez bientôt.
        </p>
      )}

      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <Link key={tab} href={`/zones/${zone.slug}/${tab}`} className={styles.card}>
            <div className={styles.cardHeader}>{TAB_LABELS[tab]}</div>
            <div className={styles.cardBody}>
              {tab === "approche" && (
                <ul>
                  <li>Fiches synthèses thématiques</li>
                  <li>Cartes et présentation pays</li>
                </ul>
              )}
              {tab === "actualite" && (
                <ul>
                  <li>Carte interactive des événements récents</li>
                  <li>Articles et informations du théâtre</li>
                </ul>
              )}
              {tab === "analyse" && (
                <ul>
                  <li>Point de situation hebdomadaire</li>
                  <li>Analyses et perspectives</li>
                </ul>
              )}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
