"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { dossierHref, type DossierView } from "@/lib/espace";
import type { Dossier } from "@/lib/investigation/types";
import { useEntities, useInvestigationStorage, useNotes } from "@/lib/investigation/InvestigationContext";
import styles from "./DossierTile.module.css";

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

/** Vignette d'un dossier : son nom, le nombre de fiches et d'entités, et la date de la dernière modification. */
export function DossierTile({ dossier, view }: { dossier: Dossier; view: DossierView }) {
  const notes = useNotes(dossier.id);
  const entities = useEntities(dossier.id);
  return (
    <Link href={dossierHref(dossier.id, view)} className={styles.tile} draggable={false}>
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
