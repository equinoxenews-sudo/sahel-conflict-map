"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useInvestigationStorage } from "@/lib/investigation/InvestigationContext";
import { PROOF_ACCEPT, formatFileSize, proofMime, putFile, validateProofFile } from "@/lib/investigation/fileStore";
import type { Source } from "@/lib/investigation/types";
import styles from "./CitePicker.module.css";

interface CitePickerProps {
  /** Titre du panneau (par défaut « Ajouter une source »). */
  heading?: string;
  /** Texte du bouton de création (par défaut « Créer et ajouter »). */
  submitLabel?: string;
  dossierId: string;
  sources: Source[];
  /** Une source est choisie (ou vient d'être créée) : la référence s'insère dans le texte. */
  onPick: (sourceId: string) => void;
  onClose: () => void;
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Choisir une source du dossier, ou en créer une sur place (adresse URL et/ou document PDF, JPG, PNG).
export default function CitePicker({ heading = "Ajouter une source", submitLabel = "Créer et ajouter", dossierId, sources, onPick, onClose }: CitePickerProps) {
  const storage = useInvestigationStorage();
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...sources]
      .filter((source) => !needle || source.title.toLowerCase().includes(needle) || source.url.toLowerCase().includes(needle))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [sources, query]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const cleanTitle = title.trim();
    const cleanUrl = url.trim();
    if (!cleanTitle) return setError("Donne un titre à la source.");
    if (!cleanUrl && !file) return setError("Ajoute une adresse (URL) ou un document.");
    if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) return setError("L'adresse doit commencer par http:// ou https://");
    if (file) {
      const problem = validateProofFile(file);
      if (problem) return setError(problem);
    }
    setBusy(true);
    try {
      const mime = file ? proofMime(file) : null;
      const fileId = file ? await putFile(file) : null;
      const source = storage.addSource({
        dossierId,
        title: cleanTitle,
        url: cleanUrl,
        platform: "",
        publishedAt: null,
        collectedAt: new Date().toISOString(),
        summary: "",
        tags: [],
        reliability: 3,
        notes: "",
        claimType: "observed",
        ...(file && fileId && mime ? { file: { id: fileId, name: file.name, mime, size: file.size } } : {}),
      });
      onPick(source.id);
    } catch {
      setError("Impossible d'enregistrer le document dans ce navigateur.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.picker} role="dialog" aria-label={heading}>
      <div className={styles.head}>
        <strong>{heading}</strong>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Fermer">
          ×
        </button>
      </div>

      {sources.length > 0 ? (
        <>
          <input className={styles.input} type="search" placeholder="Chercher une source du dossier…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <ul className={styles.list}>
            {shown.length === 0 ? <li className={styles.empty}>Aucune source ne correspond.</li> : null}
            {shown.map((source) => (
              <li key={source.id}>
                <button type="button" className={styles.source} onClick={() => onPick(source.id)}>
                  <span className={styles.sourceTitle}>{source.title}</span>
                  <small className={styles.sourceMeta}>
                    {[source.url ? host(source.url) : null, source.file ? `${source.file.mime === "application/pdf" ? "PDF" : "image"} · ${formatFileSize(source.file.size)}` : null]
                      .filter(Boolean)
                      .join(" · ") || "sans adresse"}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className={styles.empty}>Aucune source dans ce dossier : crée la première ci-dessous.</p>
      )}

      <form className={styles.form} onSubmit={create}>
        <span className={styles.formTitle}>Nouvelle source</span>
        <input className={styles.input} placeholder="Titre (ex : Arrêté du 12 mars 2023)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={styles.input} type="url" placeholder="Adresse (URL), facultative si tu joins un document" value={url} onChange={(e) => setUrl(e.target.value)} />
        <label className={styles.file}>
          <span>Document-preuve (PDF, JPG, PNG — 10 Mo max)</span>
          <input type="file" accept={PROOF_ACCEPT} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        {error ? <p className={styles.error}>{error}</p> : null}
        <button type="submit" className={styles.submit} disabled={busy}>
          {busy ? "Enregistrement…" : submitLabel}
        </button>
      </form>
    </div>
  );
}
