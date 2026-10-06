"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import DossierExportImport from "@/components/investigation/DossierExportImport";
import EntityGraphPanel from "@/components/investigation/EntityGraphPanel";
import NotesWorkspace from "@/components/investigation/NotesWorkspace";
import SourcesPanel from "@/components/investigation/SourcesPanel";
import { ensureFiche } from "@/lib/investigation/fiches";
import {
  useDossier,
  useEntities,
  useInvestigationStorage,
  useNotes,
} from "@/lib/investigation/InvestigationContext";
import sharedStyles from "@/app/investigation/dossiers/page.module.css";
import styles from "./page.module.css";

type Tab = "sources" | "graphe" | "notes";

const TABS: { key: Tab; label: string }[] = [
  { key: "sources", label: "Sources" },
  { key: "graphe", label: "Graphe" },
  { key: "notes", label: "Notes" },
];

export default function DossierWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const dossier = useDossier(id);
  const storage = useInvestigationStorage();
  const notes = useNotes(id);
  const entities = useEntities(id);

  const [tab, setTab] = useState<Tab>("sources");
  // État partagé entre le graphe et les notes : la fiche ouverte dans l'éditeur,
  // le graphe affiché à côté du texte, et la fiche sur laquelle le centrer.
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [showGraph, setShowGraph] = useState(false);
  const [focus, setFocus] = useState<{ entityId: string; nonce: number } | null>(null);

  // « Ouvrir la fiche » depuis le graphe : crée la fiche texte si besoin et passe
  // aux notes, avec le graphe resté ouvert à droite.
  function openFiche(entityId: string) {
    const entity = entities.find((e) => e.id === entityId);
    if (!entity) return;
    setActiveNoteId(ensureFiche(storage, notes, entity).id);
    setShowGraph(true);
    setTab("notes");
  }

  // « Voir dans le graphe » depuis une fiche : ouvre le graphe à droite et le centre sur la carte.
  function showInGraph(entityId: string) {
    setShowGraph(true);
    setFocus((current) => ({ entityId, nonce: (current?.nonce ?? 0) + 1 }));
  }

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
    <div className={tab === "notes" ? `${styles.wrap} ${styles.wrapWide}` : styles.wrap}>
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
      {tab === "graphe" && <EntityGraphPanel dossierId={dossier.id} onOpenFiche={openFiche} />}
      {tab === "notes" && (
        <NotesWorkspace
          dossierId={dossier.id}
          activeNoteId={activeNoteId}
          onActiveNoteChange={setActiveNoteId}
          showGraph={showGraph}
          onShowGraphChange={setShowGraph}
          focusRequest={focus}
          onShowInGraph={showInGraph}
          onOpenFiche={openFiche}
        />
      )}
    </div>
  );
}
