"use client";

import { useState } from "react";
import { renderGraphPng, type ExportOptions } from "@/lib/investigation/exportImage";
import styles from "./ExportPanel.module.css";

interface ExportPanelProps {
  /** Élément `.react-flow` du graphe affiché. */
  getContainer: () => HTMLElement | null;
  dossierName: string;
  onClose: () => void;
}

function fileName(dossierName: string): string {
  const base = dossierName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${base || "graphe"}-${new Date().toISOString().slice(0, 10)}.png`;
}

// Export du graphe en image : le graphe entier, cadré, en haute définition, avec
// en option un bandeau (titre, date, légende) et sans les coordonnées personnelles.
export default function ExportPanel({ getContainer, dossierName, onClose }: ExportPanelProps) {
  const [background, setBackground] = useState<ExportOptions["background"]>("dark");
  const [maskContacts, setMaskContacts] = useState(false);
  const [caption, setCaption] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function render(): Promise<Blob | null> {
    const container = getContainer();
    if (!container) {
      setMessage({ kind: "error", text: "Le graphe n'est pas affiché." });
      return null;
    }
    try {
      return await renderGraphPng(container, { background, maskContacts, caption, title: dossierName });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Export impossible." });
      return null;
    }
  }

  async function download() {
    setBusy(true);
    setMessage(null);
    const blob = await render();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName(dossierName);
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      setMessage({ kind: "ok", text: "Image téléchargée." });
    }
    setBusy(false);
  }

  async function copy() {
    setBusy(true);
    setMessage(null);
    const blob = await render();
    if (blob) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setMessage({ kind: "ok", text: "Image copiée : colle-la dans ton rapport (Ctrl+V)." });
      } catch {
        setMessage({ kind: "error", text: "Copie refusée par le navigateur : utilise « Télécharger »." });
      }
    }
    setBusy(false);
  }

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        <label className={styles.option}>
          Fond
          <select className={styles.control} value={background} onChange={(e) => setBackground(e.target.value as ExportOptions["background"])}>
            <option value="dark">Sombre (comme à l&apos;écran)</option>
            <option value="light">Blanc (pour imprimer)</option>
          </select>
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={caption} onChange={(e) => setCaption(e.target.checked)} />
          Titre, date et légende
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={maskContacts} onChange={(e) => setMaskContacts(e.target.checked)} />
          Masquer les coordonnées (e-mails, téléphones, comptes, lieux)
        </label>
      </div>
      <div className={styles.row}>
        <button type="button" className={styles.primary} onClick={download} disabled={busy}>
          {busy ? "Export…" : "Télécharger le PNG"}
        </button>
        <button type="button" className={styles.secondary} onClick={copy} disabled={busy}>
          Copier l&apos;image
        </button>
        <button type="button" className={styles.secondary} onClick={onClose}>
          Fermer
        </button>
        {message ? <span className={message.kind === "ok" ? styles.ok : styles.error}>{message.text}</span> : null}
      </div>
      <p className={styles.note}>
        Le graphe entier est exporté. Les images référencées par une adresse web externe peuvent manquer si leur site les protège ; les images
        importées depuis ton ordinateur sont toujours incluses.
      </p>
    </div>
  );
}
