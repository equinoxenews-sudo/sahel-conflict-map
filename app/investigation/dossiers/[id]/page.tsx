"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import DossierBackup from "@/components/investigation/DossierBackup";
import EntityGraphPanel from "@/components/investigation/EntityGraphPanel";
import NotesWorkspace from "@/components/investigation/NotesWorkspace";
import SourcesPanel from "@/components/investigation/SourcesPanel";
import { ensureAttributePage, ensureFiche } from "@/lib/investigation/fiches";
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
  // Le graphe à côté du texte : fermé à la main, il le reste quand on ouvre une autre fiche.
  const GRAPH_PREF = "equinoxe-notes-graph";
  const graphPref = () => {
    try {
      return window.localStorage.getItem(GRAPH_PREF);
    } catch {
      return null;
    }
  };
  function changeShowGraph(show: boolean) {
    setShowGraph(show);
    try {
      window.localStorage.setItem(GRAPH_PREF, show ? "shown" : "hidden");
    } catch {
      // stockage indisponible : le choix vaut pour cette session
    }
  }
  const [focus, setFocus] = useState<{ entityId: string; nonce: number } | null>(null);

  // « Ouvrir la fiche » depuis le graphe : crée la fiche texte si besoin et passe
  // aux notes, avec le graphe resté ouvert à droite.
  function openFiche(entityId: string) {
    const entity = entities.find((e) => e.id === entityId);
    if (!entity) return;
    setActiveNoteId(ensureFiche(storage, notes, entity).id);
    if (graphPref() !== "hidden") setShowGraph(true);
    setTab("notes");
  }

  // Clic sur une coordonnée (téléphone, compte, e-mail…) : sa page s'ouvre, créée au premier clic.
  function openAttribute(entityId: string, attributeId: string) {
    const entity = entities.find((e) => e.id === entityId);
    const attribute = entity?.attributes?.find((a) => a.id === attributeId);
    if (!entity || !attribute) return;
    setActiveNoteId(ensureAttributePage(storage, notes, entity, attribute).id);
    if (graphPref() !== "hidden") setShowGraph(true);
    setTab("notes");
  }

  // « Voir dans le graphe » depuis une fiche : ouvre le graphe à droite et le centre sur la carte.
  function showInGraph(entityId: string) {
    changeShowGraph(true);
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
    <div className={tab === "notes" ? `${styles.wrap} ${styles.wrapWide}` : tab === "graphe" ? `${styles.wrap} ${styles.wrapFull}` : styles.wrap}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <Link href="/investigation/dossiers" className={styles.back}>
            ← Dossiers
          </Link>
          <span className={styles.title}>{dossier.name}</span>
          {dossier.description && <span className={styles.desc}>{dossier.description}</span>}
        </div>
        <DossierBackup dossierId={dossier.id} dossierName={dossier.name} className={sharedStyles.importBtn} />
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
      {tab === "graphe" && <EntityGraphPanel dossierId={dossier.id} onOpenFiche={openFiche} onOpenAttribute={openAttribute} />}
      {tab === "notes" && (
        <NotesWorkspace
          dossierId={dossier.id}
          activeNoteId={activeNoteId}
          onActiveNoteChange={setActiveNoteId}
          showGraph={showGraph}
          onShowGraphChange={changeShowGraph}
          focusRequest={focus}
          onShowInGraph={showInGraph}
          onOpenFiche={openFiche}
          onOpenAttribute={openAttribute}
          onClose={() => setTab("graphe")}
        />
      )}
    </div>
  );
}
