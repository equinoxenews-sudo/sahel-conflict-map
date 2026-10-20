"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteBackup,
  getBackupJson,
  listBackups,
  saveBackup,
  shouldAutoBackup,
  type BackupCounts,
  type BackupKind,
  type BackupMeta,
} from "@/lib/investigation/backups";
import { useInvestigationStorage } from "@/lib/investigation/InvestigationContext";
import styles from "./DossierBackup.module.css";

interface DossierBackupProps {
  dossierId: string;
  dossierName: string;
  className?: string;
}

const KIND_LABELS: Record<BackupKind, string> = {
  manual: "Manuelle",
  auto: "Automatique",
  "before-restore": "Avant une restauration",
};

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const timeFormat = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

function fileName(dossierName: string, createdAt: string): string {
  const slug = dossierName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "dossier";
  const date = new Date(createdAt);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${slug}-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}h${pad(date.getMinutes())}.json`;
}

function downloadJson(json: string, name: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function describe(meta: Pick<BackupMeta, "entities" | "relations" | "notes" | "sources">): string {
  return `${meta.entities} fiche(s) · ${meta.relations} relation(s) · ${meta.notes} note(s) · ${meta.sources} source(s)`;
}

// Bouton « Sauvegarder » d'un dossier : une copie datée est gardée dans le navigateur et un fichier
// est téléchargé sur l'appareil. La liste permet de revenir à une version précédente.
export default function DossierBackup({ dossierId, dossierName, className }: DossierBackupProps) {
  const storage = useInvestigationStorage();
  const [backups, setBackups] = useState<BackupMeta[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setBackups(await listBackups(dossierId));
    } catch {
      setBackups([]);
    }
  }, [dossierId]);

  // Compte le contenu actuel du dossier, d'après les données les plus récentes du navigateur.
  const currentCounts = useCallback((): BackupCounts => {
    const data = storage.load();
    return {
      entities: data.entities.filter((x) => x.dossierId === dossierId).length,
      relations: data.relations.filter((x) => x.dossierId === dossierId).length,
      notes: data.notes.filter((x) => x.dossierId === dossierId).length,
      sources: data.sources.filter((x) => x.dossierId === dossierId).length,
    };
  }, [storage, dossierId]);

  const snapshot = useCallback(
    async (kind: BackupKind): Promise<{ meta: BackupMeta; json: string }> => {
      // Les sauvegardes automatiques gardent la liste des documents sans les recopier : seules la sauvegarde
      // manuelle (et sa copie avant restauration) les emportent, pour ne pas multiplier les mégaoctets.
      const json = await storage.exportDossier(dossierId, { includeFiles: kind !== "auto" });
      const meta: BackupMeta = {
        id: crypto.randomUUID(),
        dossierId,
        dossierName,
        createdAt: new Date().toISOString(),
        kind,
        ...currentCounts(),
        bytes: json.length,
      };
      await saveBackup(meta, json);
      return { meta, json };
    },
    [storage, dossierId, dossierName, currentCounts]
  );

  // Sauvegarde automatique discrète à l'ouverture du dossier (au plus toutes les 3 h, jamais après une
  // chute brutale du contenu : les bonnes sauvegardes ne sont pas remplacées par une version abîmée).
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const existing = await listBackups(dossierId);
        if (cancelled) return;
        setBackups(existing);
        if (shouldAutoBackup(existing[0] ?? null, currentCounts(), Date.now())) {
          await snapshot("auto");
          if (!cancelled) await refresh();
        }
      } catch {
        // IndexedDB indisponible : pas de sauvegarde automatique, le bouton signalera l'erreur.
      }
    }, 2500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [dossierId, currentCounts, snapshot, refresh]);

  async function handleSave() {
    setBusy(true);
    setMessage(null);
    try {
      const { meta, json } = await snapshot("manual");
      downloadJson(json, fileName(dossierName, meta.createdAt));
      await refresh();
      setMessage(`Sauvegardé à ${timeFormat.format(new Date(meta.createdAt))} — ${meta.entities} fiche(s), ${meta.notes} note(s). Fichier téléchargé.`);
      setOpen(true);
    } catch (error) {
      setMessage(error instanceof Error ? `Sauvegarde impossible : ${error.message}` : "Sauvegarde impossible.");
      setOpen(true);
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore(backup: BackupMeta) {
    const now = currentCounts();
    const ok = window.confirm(
      `Restaurer la sauvegarde du ${dateFormat.format(new Date(backup.createdAt))} ?\n\nSauvegarde : ${describe(backup)}\nActuellement : ${describe(now)}\n\nLa version actuelle est d'abord sauvegardée, tu pourras y revenir.`
    );
    if (!ok) return;
    setBusy(true);
    setMessage(null);
    try {
      const json = await getBackupJson(backup.id);
      if (!json) throw new Error("Sauvegarde introuvable.");
      await snapshot("before-restore");
      await storage.importDossier(json, { keepIds: true });
      await refresh();
      setMessage(`Sauvegarde du ${dateFormat.format(new Date(backup.createdAt))} restaurée.`);
    } catch (error) {
      setMessage(error instanceof Error ? `Restauration impossible : ${error.message}` : "Restauration impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload(backup: BackupMeta) {
    const json = await getBackupJson(backup.id);
    if (json) downloadJson(json, fileName(backup.dossierName, backup.createdAt));
  }

  async function handleDelete(backup: BackupMeta) {
    if (!window.confirm("Supprimer cette sauvegarde ?")) return;
    await deleteBackup(backup.id).catch(() => undefined);
    await refresh();
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.buttons}>
        <button type="button" className={`${className ?? ""} ${styles.save}`} disabled={busy} onClick={() => void handleSave()}>
          {busy ? "Sauvegarde…" : "Sauvegarder"}
        </button>
        <button
          type="button"
          className={className}
          aria-expanded={open}
          onClick={() => {
            setOpen((value) => !value);
            void refresh();
          }}
        >
          Sauvegardes ({backups.length})
        </button>
      </div>

      {open ? (
        <div className={styles.panel}>
          {message ? <p className={styles.message}>{message}</p> : null}
          {backups.length === 0 ? (
            <p className={styles.empty}>
              Aucune sauvegarde pour l&apos;instant. « Sauvegarder » garde une copie datée dans ce navigateur et télécharge un
              fichier.
            </p>
          ) : (
            <ul className={styles.list}>
              {backups.map((backup) => (
                <li key={backup.id} className={styles.row}>
                  <div className={styles.rowMain}>
                    <span className={styles.date}>
                      {dateFormat.format(new Date(backup.createdAt))} · {KIND_LABELS[backup.kind]}
                    </span>
                    <span className={styles.detail}>
                      {describe(backup)} · {formatBytes(backup.bytes)}
                    </span>
                  </div>
                  <div className={styles.actions}>
                    <button type="button" className={styles.action} disabled={busy} onClick={() => void handleRestore(backup)}>
                      Restaurer
                    </button>
                    <button type="button" className={styles.actionGhost} onClick={() => void handleDownload(backup)}>
                      Fichier
                    </button>
                    <button type="button" className={styles.actionGhost} onClick={() => void handleDelete(backup)}>
                      Supprimer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.hint}>
            Les copies sont gardées dans ce navigateur : le fichier téléchargé, lui, reste sur ton appareil même si le
            navigateur est vidé. Une sauvegarde automatique est faite à l&apos;ouverture du dossier (au plus toutes les 3 h).
          </p>
        </div>
      ) : null}
    </div>
  );
}
