"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useDossiers, useInvestigationStorage } from "@/lib/investigation/InvestigationContext";
import styles from "./page.module.css";

export default function DossiersPage() {
  const dossiers = useDossiers();
  const storage = useInvestigationStorage();
  const [name, setName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCreate(e: FormEvent) {
    e.preventDefault();
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

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      storage.importDossier(text);
    } catch {
      window.alert("Fichier JSON invalide — import impossible.");
    }
  }

  const sorted = [...dossiers].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>Dossiers</span>
        <button type="button" className={styles.importBtn} onClick={() => fileInputRef.current?.click()}>
          Importer un dossier (JSON)
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImportFile} />
      </div>

      <form className={styles.newForm} onSubmit={handleCreate}>
        <input
          className={styles.input}
          type="text"
          placeholder="Nom du nouveau dossier"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className={styles.button} disabled={!name.trim()}>
          Créer
        </button>
      </form>

      {sorted.length === 0 ? (
        <div className={styles.emptyState}>Aucun dossier — créez-en un pour commencer une investigation.</div>
      ) : (
        <div className={styles.list}>
          {sorted.map((d) => (
            <div key={d.id} className={styles.card}>
              <Link href={`/investigation/dossiers/${d.id}`} className={styles.cardBody}>
                <span className={styles.cardName}>{d.name}</span>
                <span className={styles.cardDesc}>{d.description || "Sans description"}</span>
              </Link>
              <div className={styles.cardActions}>
                <button type="button" className={styles.iconBtn} onClick={() => handleRename(d.id, d.name, d.description)}>
                  Renommer
                </button>
                <button type="button" className={styles.iconBtn} onClick={() => handleDelete(d.id, d.name)}>
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
