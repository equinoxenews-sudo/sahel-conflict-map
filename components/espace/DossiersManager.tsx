"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import CloudSyncPanel from "@/components/investigation/CloudSyncPanel";
import type { DossierView } from "@/lib/espace";
import { useDossiers, useInvestigationStorage } from "@/lib/investigation/InvestigationContext";
import { DossierTile } from "./DossierTile";
import styles from "./DossiersManager.module.css";

interface DossiersManagerProps {
  /** Ce que l'on ouvre en cliquant un dossier : ses notes (page NOTES) ou son graphe (page GRAPH). */
  view: Extract<DossierView, "notes" | "graphe">;
  title: string;
  intro: string;
}

// Liste des dossiers de l'abonné, sous forme de vignettes : création, renommage, suppression, import JSON et copie en
// ligne. Même logique qu'avant le passage à « Mon espace » (les dossiers n'ont pas bougé).
export default function DossiersManager({ view, title, intro }: DossiersManagerProps) {
  const dossiers = useDossiers();
  const storage = useInvestigationStorage();
  const [name, setName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    storage.createDossier(trimmed, "");
    setName("");
  }

  function handleRename(id: string, currentName: string, currentDesc: string) {
    const next = window.prompt("Nom du dossier :", currentName);
    if (next === null || !next.trim()) return;
    storage.renameDossier(id, next.trim(), currentDesc);
  }

  function handleDelete(id: string, dossierName: string) {
    if (!window.confirm(`Supprimer le dossier « ${dossierName} » et tout son contenu (sources, entités, notes) ?`)) return;
    storage.deleteDossier(id);
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      await storage.importDossier(await file.text());
    } catch {
      window.alert("Fichier JSON invalide — import impossible.");
    }
  }

  const sorted = [...dossiers].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.intro}>{intro}</p>
        </div>
        <button type="button" className={styles.ghostBtn} onClick={() => fileInputRef.current?.click()}>
          Importer un dossier (JSON)
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImportFile} />
      </div>

      <CloudSyncPanel />

      <form className={styles.newForm} onSubmit={handleCreate}>
        <input
          className={styles.input}
          type="text"
          placeholder="Nom du nouveau dossier"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button type="submit" className={styles.button} disabled={!name.trim()}>
          Créer
        </button>
      </form>

      {sorted.length === 0 ? (
        <div className={styles.empty}>Aucun dossier — créez-en un pour commencer.</div>
      ) : (
        <div className={styles.grid}>
          {sorted.map((dossier) => (
            <div key={dossier.id} className={styles.cell}>
              <DossierTile dossier={dossier} view={view} />
              <div className={styles.actions}>
                <button type="button" className={styles.smallBtn} onClick={() => handleRename(dossier.id, dossier.name, dossier.description)}>
                  Renommer
                </button>
                <button type="button" className={styles.smallBtn} onClick={() => handleDelete(dossier.id, dossier.name)}>
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
