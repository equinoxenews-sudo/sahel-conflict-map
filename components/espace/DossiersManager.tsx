"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import CloudSyncPanel from "@/components/investigation/CloudSyncPanel";
import type { DossierView } from "@/lib/espace";
import { ignoreRemoteDossier } from "@/lib/investigation/autoSave";
import { deleteCloud } from "@/lib/investigation/cloudSync";
import { coverFromFile } from "@/lib/investigation/cover";
import { ImageFileError } from "@/lib/investigation/imageStore";
import { useDossiers, useInvestigationStorage } from "@/lib/investigation/InvestigationContext";
import type { Dossier } from "@/lib/investigation/types";
import CoverDialog from "./CoverDialog";
import DeleteDossierDialog from "./DeleteDossierDialog";
import { DossierTile } from "./DossierTile";
import EspaceTitle from "./EspaceTitle";
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
  const [toDelete, setToDelete] = useState<Dossier | null>(null);
  const [coverFor, setCoverFor] = useState<Dossier | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const coverTarget = useRef<string | null>(null);

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

  function confirmDelete() {
    if (toDelete) {
      const id = toDelete.id;
      storage.deleteDossier(id);
      // La copie en ligne part aussi : sinon la sauvegarde automatique remettrait le dossier sur cet appareil. Si elle ne
      // peut pas être supprimée maintenant (hors connexion), le dossier n'est plus proposé ici.
      void deleteCloud(id).catch(() => ignoreRemoteDossier(id));
    }
    setToDelete(null);
  }

  function handleCoverClick(id: string) {
    coverTarget.current = id;
    coverInputRef.current?.click();
  }

  async function handleCoverFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    const id = coverTarget.current;
    coverTarget.current = null;
    if (!file || !id) return;
    try {
      storage.setDossierCover(id, await coverFromFile(file));
    } catch (error) {
      window.alert(error instanceof ImageFileError ? error.message : "Impossible d'utiliser cette image.");
    }
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
          <EspaceTitle section={view === "graphe" ? "graph" : "notes"}>{title}</EspaceTitle>
          <p className={styles.intro}>{intro}</p>
        </div>
        <button type="button" className={styles.ghostBtn} onClick={() => fileInputRef.current?.click()}>
          Importer un dossier (JSON)
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImportFile} />
        <input ref={coverInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={handleCoverFile} />
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
                <button type="button" className={styles.smallBtn} onClick={() => setToDelete(dossier)}>
                  Supprimer
                </button>
              </div>
              {view === "notes" && (
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.smallBtn}
                    onClick={() => (dossier.coverImage ? setCoverFor(dossier) : handleCoverClick(dossier.id))}
                  >
                    {dossier.coverImage ? "Modifier la photo" : "Ajouter une photo"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {coverFor && (
        <CoverDialog
          dossier={coverFor}
          onCancel={() => setCoverFor(null)}
          onChange={() => {
            handleCoverClick(coverFor.id);
            setCoverFor(null);
          }}
          onRemove={() => {
            storage.setDossierCover(coverFor.id, null);
            setCoverFor(null);
          }}
        />
      )}

      {toDelete && <DeleteDossierDialog dossier={toDelete} onCancel={() => setToDelete(null)} onConfirm={confirmDelete} />}
    </div>
  );
}
