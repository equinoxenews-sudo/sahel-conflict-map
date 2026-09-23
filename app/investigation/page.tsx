"use client";

import Link from "next/link";
import SearchBar from "@/components/investigation/SearchBar";
import { useDossiers } from "@/lib/investigation/InvestigationContext";
import styles from "./page.module.css";

const SPACES = [
  {
    href: "/investigation/recherche",
    label: "Recherche",
    desc: "Recherche OSINT multi-plateformes par type d'entrée (nom, domaine, navire, portefeuille...).",
  },
  {
    href: "/investigation/dossiers",
    label: "Sources",
    desc: "Sources collectées, notées et classées par dossier.",
  },
  {
    href: "/investigation/dossiers",
    label: "Graphe",
    desc: "Entités et relations, avec distinction documentée / hypothèse.",
  },
  {
    href: "/investigation/dossiers",
    label: "Notes & Canvas",
    desc: "Notes liées au dossier et tableau libre de cartes.",
  },
  {
    href: "/investigation/toolbox",
    label: "Toolbox",
    desc: "OCR et lecture EXIF côté navigateur, liens d'inspection de domaines.",
  },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function InvestigationHomePage() {
  const dossiers = useDossiers();
  const recent = [...dossiers].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);

  return (
    <div>
      <div className={styles.hero}>
        <h1 className={styles.title}>Équinoxe Investigation</h1>
        <p className={styles.subtitle}>
          Recherche OSINT, dossiers, graphe relationnel et boîte à outils — tout reste sur cet appareil.
        </p>
        <div className={styles.searchWrap}>
          <SearchBar />
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Dossiers récents</span>
          <Link href="/investigation/dossiers" className={styles.sectionLink}>
            Voir tous les dossiers →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className={styles.emptyState}>
            Aucun dossier pour l&apos;instant. <Link href="/investigation/dossiers">Créez le premier</Link> pour
            commencer à collecter des sources et construire un graphe.
          </div>
        ) : (
          <div className={styles.dossierGrid}>
            {recent.map((d) => (
              <Link key={d.id} href={`/investigation/dossiers/${d.id}`} className={styles.dossierCard}>
                <span className={styles.dossierName}>{d.name}</span>
                <span className={styles.dossierMeta}>Mis à jour le {formatDate(d.updatedAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Espaces</span>
        </div>
        <div className={styles.spacesGrid}>
          {SPACES.map((s) => (
            <Link key={s.label} href={s.href} className={styles.spaceCard}>
              <span className={styles.spaceLabel}>{s.label}</span>
              <span className={styles.spaceDesc}>{s.desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
