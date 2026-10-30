"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import DossierBackup from "@/components/investigation/DossierBackup";
import EntityGraphPanel from "@/components/investigation/EntityGraphPanel";
import NotesWorkspace from "@/components/investigation/NotesWorkspace";
import SourcesPanel from "@/components/investigation/SourcesPanel";
import { ESPACE_ROOT, dossierHref, parseDossierView, type DossierView } from "@/lib/espace";
import { duplicateDossier } from "@/lib/investigation/duplicate";
import { ensureAttributePage, ensureFiche } from "@/lib/investigation/fiches";
import { useDossier, useEntities, useInvestigationStorage, useNotes } from "@/lib/investigation/InvestigationContext";
import styles from "./DossierWorkspace.module.css";

const TABS: { key: DossierView; label: string }[] = [
  { key: "sources", label: "Sources" },
  { key: "graphe", label: "Graphe" },
  { key: "notes", label: "Notes" },
];

// Un dossier ouvert : ses sources, son graphe et ses notes, avec le graphe affichable à côté du texte. La vue ouverte
// est portée par l'adresse (`?vue=`) : le menu de gauche allume « Notes » ou « Graph » en conséquence, et changer de
// vue ne perd ni la fiche ouverte ni le graphe affiché à côté.
export default function DossierWorkspace() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const tab = parseDossierView(useSearchParams().get("vue"));
  const dossier = useDossier(id);
  const storage = useInvestigationStorage();
  const notes = useNotes(id);
  const entities = useEntities(id);

  // État partagé entre le graphe et les notes : la fiche ouverte dans l'éditeur, le graphe affiché à côté du texte,
  // et la fiche sur laquelle le centrer.
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [showGraph, setShowGraph] = useState(false);
  const [focus, setFocus] = useState<{ entityId: string; nonce: number } | null>(null);

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

  // « Faire une copie » : le dossier est dupliqué (nom + « (copie) ») et on travaille directement dedans, dans la même vue.
  const [copying, setCopying] = useState(false);
  async function makeCopy() {
    if (copying) return;
    setCopying(true);
    try {
      router.push(dossierHref(await duplicateDossier(storage, id), tab));
    } catch {
      window.alert("La copie a échoué : le dossier d'origine n'a pas été modifié.");
    } finally {
      setCopying(false);
    }
  }

  function goTo(view: DossierView) {
    router.replace(`${pathname}?vue=${view}`, { scroll: false });
  }

  // « Ouvrir la fiche » depuis le graphe : crée la fiche texte si besoin et passe aux notes, avec le graphe resté
  // ouvert à droite.
  function openFiche(entityId: string) {
    const entity = entities.find((e) => e.id === entityId);
    if (!entity) return;
    setActiveNoteId(ensureFiche(storage, notes, entity).id);
    if (graphPref() !== "hidden") setShowGraph(true);
    goTo("notes");
  }

  // Clic sur une coordonnée (téléphone, compte, e-mail…) : sa page s'ouvre, créée au premier clic.
  function openAttribute(entityId: string, attributeId: string) {
    const entity = entities.find((e) => e.id === entityId);
    const attribute = entity?.attributes?.find((a) => a.id === attributeId);
    if (!entity || !attribute) return;
    setActiveNoteId(ensureAttributePage(storage, notes, entity, attribute).id);
    if (graphPref() !== "hidden") setShowGraph(true);
    goTo("notes");
  }

  // « Voir dans le graphe » depuis une fiche : ouvre le graphe à droite et le centre sur la carte.
  function showInGraph(entityId: string) {
    changeShowGraph(true);
    setFocus((current) => ({ entityId, nonce: (current?.nonce ?? 0) + 1 }));
  }

  const listHref = `${ESPACE_ROOT}/${tab === "graphe" ? "graph" : "notes"}`;

  if (!dossier) {
    return (
      <div className={styles.notFound}>
        Dossier introuvable.{" "}
        <Link href={listHref} style={{ color: "var(--accent-gold-bright)" }}>
          Retour aux dossiers
        </Link>
      </div>
    );
  }

  return (
    <div className={tab === "notes" ? `${styles.wrap} ${styles.wrapWide}` : tab === "graphe" ? `${styles.wrap} ${styles.wrapFull}` : styles.wrap}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <Link href={listHref} className={styles.back}>
            ← Dossiers
          </Link>
          <span className={styles.title}>{dossier.name}</span>
          {dossier.description && <span className={styles.desc}>{dossier.description}</span>}
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostBtn} onClick={() => void makeCopy()} disabled={copying} title="Crée un dossier indépendant (copie) et l'ouvre">
            {copying ? "Copie en cours…" : "Faire une copie"}
          </button>
          <DossierBackup dossierId={dossier.id} dossierName={dossier.name} className={styles.ghostBtn} />
        </div>
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => goTo(t.key)}
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
          onClose={() => goTo("graphe")}
        />
      )}
    </div>
  );
}
