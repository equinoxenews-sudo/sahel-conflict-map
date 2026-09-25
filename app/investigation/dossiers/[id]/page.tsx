"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import DossierExportImport from "@/components/investigation/DossierExportImport";
import EntityGraphPanel from "@/components/investigation/EntityGraphPanel";
import NotesCanvasPanel from "@/components/investigation/NotesCanvasPanel";
import SourcesPanel from "@/components/investigation/SourcesPanel";
import { useDossier } from "@/lib/investigation/InvestigationContext";
import sharedStyles from "@/app/investigation/dossiers/page.module.css";
import styles from "./page.module.css";

type Tab = "sources" | "graphe" | "notes";

const TABS: { key: Tab; label: string }[] = [
  { key: "sources", label: "Sources" },
  { key: "graphe", label: "Graphe" },
  { key: "notes", label: "Notes & Canvas" },
];

export default function DossierWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const dossier = useDossier(id);
  const [tab, setTab] = useState<Tab>("sources");

  if (!dossier) {
    return (
      <div className={styles.notFound}>
        Dossier introuvable.{" "}
        <Link href="/investigation/dossiers" style={{ color: "var(--accent-gold-bright)" }}>
          Retour aux dossiers
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <Link href="/investigation/dossiers" className={styles.back}>
            ← Dossiers
          </Link>
          <span className={styles.title}>{dossier.name}</span>
          {dossier.description && <span className={styles.desc}>{dossier.description}</span>}
        </div>
        <DossierExportImport dossierId={dossier.id} dossierName={dossier.name} className={sharedStyles.importBtn} />
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "sources" && <SourcesPanel dossierId={dossier.id} />}
      {tab === "graphe" && <EntityGraphPanel dossierId={dossier.id} />}
      {tab === "notes" && <NotesCanvasPanel dossierId={dossier.id} />}
    </div>
  );
}
