"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ExportQuality } from "@/lib/investigation/exportImage";
import { ficheFileName, renderFichePng, type FicheLayout } from "@/lib/investigation/exportFiche";
import type { InvestigationEntity, Note, Relation, Source } from "@/lib/investigation/types";
import type { WikiResolution } from "@/lib/investigation/wikilinks";
import { useHasMounted } from "@/lib/useHasMounted";
import FicheSheet from "./FicheSheet";
import styles from "./ExportPanel.module.css";

interface ExportFichePanelProps {
  note: Note;
  body: string;
  entity: InvestigationEntity | null;
  entities: InvestigationEntity[];
  relations: Relation[];
  sources: Source[];
  dossierName: string;
  resolve: (target: string) => WikiResolution;
  onClose: () => void;
}

// Export d'une fiche (personne, édifice, organisation… ou note libre) en image PNG : titre, en-tête, texte avec ses
// images, relations et sources, au fond sombre ou blanc, avec ou sans les coordonnées.
export default function ExportFichePanel({ note, body, entity, entities, relations, sources, dossierName, resolve, onClose }: ExportFichePanelProps) {
  const mounted = useHasMounted();
  const sheet = useRef<HTMLDivElement>(null);
  const [background, setBackground] = useState<"dark" | "light">("dark");
  const [quality, setQuality] = useState<ExportQuality>(3);
  const [layout, setLayout] = useState<FicheLayout>("auto");
  const [maskContacts, setMaskContacts] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function render(): Promise<Blob | null> {
    if (!sheet.current) {
      setMessage({ kind: "error", text: "La fiche n'est pas prête : réessaie dans un instant." });
      return null;
    }
    try {
      return await renderFichePng(sheet.current, { background, quality });
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
      link.download = ficheFileName(note.title);
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
        setMessage({ kind: "ok", text: "Image copiée : colle-la dans ta diapo (Ctrl+V)." });
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
          <select className={styles.control} value={background} onChange={(e) => setBackground(e.target.value as "dark" | "light")}>
            <option value="dark">Sombre (comme à l&apos;écran)</option>
            <option value="light">Blanc (pour imprimer)</option>
          </select>
        </label>
        <label className={styles.option}>
          Format
          <select className={styles.control} value={layout} onChange={(e) => setLayout(e.target.value as FicheLayout)}>
            <option value="auto">Hauteur selon le contenu</option>
            <option value="portrait">Portrait (A4)</option>
            <option value="landscape">Paysage (diapo 16:9, deux colonnes)</option>
          </select>
        </label>
        <label className={styles.option}>
          Netteté
          <select className={styles.control} value={quality} onChange={(e) => setQuality(Number(e.target.value) as ExportQuality)}>
            <option value={2}>Écran (×2)</option>
            <option value={3}>Diaporama (×3)</option>
            <option value={4}>Impression (×4)</option>
          </select>
        </label>
        {entity ? (
          <label className={styles.check}>
            <input type="checkbox" checked={maskContacts} onChange={(e) => setMaskContacts(e.target.checked)} />
            Masquer les coordonnées (e-mails, téléphones, comptes)
          </label>
        ) : null}
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
        L&apos;image reprend le texte tel qu&apos;il est écrit en ce moment, avec ses images, les relations et les sources de la fiche. Les images
        référencées par une adresse web externe peuvent manquer si leur site les protège.
      </p>
      {/* La fiche à photographier, hors écran. */}
      {mounted
        ? createPortal(
            <div style={{ position: "fixed", left: -20000, top: 0, pointerEvents: "none" }} aria-hidden="true">
              <FicheSheet
                ref={sheet}
                note={note}
                body={body}
                entity={entity}
                entities={entities}
                relations={relations}
                sources={sources}
                dossierName={dossierName}
                resolve={resolve}
                background={background}
                layout={layout}
                maskContacts={maskContacts}
              />
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
