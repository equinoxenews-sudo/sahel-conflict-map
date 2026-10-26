"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { dossierHref, type DossierView } from "@/lib/espace";
import { isCoverImage } from "@/lib/investigation/cover";
import { graphPreview } from "@/lib/investigation/graphPreview";
import type { Dossier } from "@/lib/investigation/types";
import { useEntities, useInvestigationStorage, useNotes, useRelations } from "@/lib/investigation/InvestigationContext";
import GraphThumb from "./GraphThumb";
import styles from "./DossierTile.module.css";

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Vignette d'un dossier : son nom, le nombre de fiches et d'entités, et la date de la dernière modification. En haut,
 * la photo de présentation (vue Notes) ou l'aperçu du graphe (vue Graph), quand il y en a une.
 */
export function DossierTile({ dossier, view }: { dossier: Dossier; view: DossierView }) {
  const notes = useNotes(dossier.id);
  const entities = useEntities(dossier.id);
  const relations = useRelations(dossier.id);
  const preview = useMemo(() => (view === "graphe" ? graphPreview(entities, relations) : null), [view, entities, relations]);
  const cover = view === "graphe" ? null : isCoverImage(dossier.coverImage) ? dossier.coverImage : null;
  return (
    <Link href={dossierHref(dossier.id, view)} className={styles.tile} draggable={false}>
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element -- petite image « data: » stockée dans le dossier
        <img src={cover} alt="" className={styles.thumb} draggable={false} />
      )}
      {preview && <GraphThumb preview={preview} className={`${styles.thumb} ${styles.graphThumb}`} />}
      <span className={styles.name}>{dossier.name}</span>
      <span className={styles.meta}>
        {view === "graphe"
          ? `${entities.length} entité${entities.length > 1 ? "s" : ""}`
          : `${notes.length} fiche${notes.length > 1 ? "s" : ""}`}
      </span>
      <span className={styles.date}>Modifié le {shortDate(dossier.updatedAt)}</span>
    </Link>
  );
}

/** Vignette « + » : crée un dossier vide et l'ouvre. */
export function NewDossierTile({ view }: { view: DossierView }) {
  const storage = useInvestigationStorage();
  const router = useRouter();

  function create() {
    const name = window.prompt("Nom du nouveau dossier :");
    if (!name?.trim()) return;
    const dossier = storage.createDossier(name.trim(), "");
    router.push(dossierHref(dossier.id, view));
  }

  return (
    <button type="button" className={`${styles.tile} ${styles.newTile}`} onClick={create}>
      <span className={styles.plus} aria-hidden>
        +
      </span>
      <span className={styles.meta}>Nouveau dossier</span>
    </button>
  );
}
