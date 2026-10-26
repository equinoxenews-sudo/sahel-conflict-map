"use client";

import { useState } from "react";
import EspaceTitle from "@/components/espace/EspaceTitle";
import OsintMap from "@/components/espace/OsintMap";
import DomainLinksPanel from "@/components/investigation/toolbox/DomainLinksPanel";
import ExifTool from "@/components/investigation/toolbox/ExifTool";
import OcrTool from "@/components/investigation/toolbox/OcrTool";
import styles from "./page.module.css";

type Tab = "carte" | "integres";

const TABS: { key: Tab; label: string }[] = [
  { key: "carte", label: "Carte des outils OSINT" },
  { key: "integres", label: "Outils intégrés" },
];

// OUTILS : la carte mentale de l'OSINT Framework (où chercher quoi, avec l'explication de chaque outil) et, dans le
// second onglet, les outils qui fonctionnent directement dans Équinoxe (lecture de texte dans une image, métadonnées,
// liens d'inspection de domaines).
export default function EspaceOutilsPage() {
  const [tab, setTab] = useState<Tab>("carte");

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>
        <EspaceTitle section="outils">Outils</EspaceTitle>
      </div>
      <div className={styles.tabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={tab === t.key ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "carte" ? (
        <OsintMap />
      ) : (
        <div className={styles.grid}>
          <OcrTool />
          <ExifTool />
          <DomainLinksPanel />
        </div>
      )}
    </div>
  );
}
