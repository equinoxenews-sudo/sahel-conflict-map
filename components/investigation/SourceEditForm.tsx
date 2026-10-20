"use client";

import { useState, type FormEvent } from "react";
import { CLAIM_TYPE_LABELS, type ClaimType, type Source } from "@/lib/investigation/types";
import styles from "./SourcesPanel.module.css";

export type SourcePatch = Partial<Omit<Source, "id" | "dossierId" | "createdAt">>;

interface SourceEditFormProps {
  source: Source;
  onSave: (patch: SourcePatch) => void;
  onCancel: () => void;
}

// Modification d'une source existante : titre, adresse, plateforme, date, fiabilité, statut, tags, résumé, notes.
// Le document joint se change depuis la carte de la source (Joindre / retirer).
export default function SourceEditForm({ source, onSave, onCancel }: SourceEditFormProps) {
  const [form, setForm] = useState({
    title: source.title,
    url: source.url,
    platform: source.platform,
    publishedAt: source.publishedAt ?? "",
    reliability: String(source.reliability),
    claimType: source.claimType,
    tags: source.tags.join(", "),
    summary: source.summary,
    notes: source.notes,
  });
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const title = form.title.trim();
    const url = form.url.trim();
    if (!title) return setError("Le titre est obligatoire.");
    if (!url && !source.file) return setError("Une source a besoin d'une adresse (URL) ou d'un document.");
    if (url && !/^https?:\/\//i.test(url)) return setError("L'adresse doit commencer par http:// ou https://");
    onSave({
      title,
      url,
      platform: form.platform.trim(),
      publishedAt: form.publishedAt || null,
      reliability: Number(form.reliability) as 1 | 2 | 3 | 4 | 5,
      claimType: form.claimType,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      summary: form.summary.trim(),
      notes: form.notes.trim(),
    });
  }

  return (
    <form className={styles.formCard} onSubmit={submit} aria-label="Modifier la source">
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label className={styles.label}>Titre</label>
          <input className={styles.input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>URL (facultative si un document est joint)</label>
          <input className={styles.input} type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Plateforme</label>
          <input className={styles.input} value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} placeholder="Telegram, presse, registre..." />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Date de publication</label>
          <input className={styles.input} type="date" value={form.publishedAt} onChange={(e) => setForm({ ...form, publishedAt: e.target.value })} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Fiabilité (1-5)</label>
          <select className={styles.select} value={form.reliability} onChange={(e) => setForm({ ...form, reliability: e.target.value })}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Statut</label>
          <select className={styles.select} value={form.claimType} onChange={(e) => setForm({ ...form, claimType: e.target.value as ClaimType })}>
            {(Object.keys(CLAIM_TYPE_LABELS) as ClaimType[]).map((claim) => (
              <option key={claim} value={claim}>
                {CLAIM_TYPE_LABELS[claim]}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Tags (séparés par virgule)</label>
          <input className={styles.input} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        </div>
      </div>
      <div className={styles.field} style={{ marginBottom: 10 }}>
        <label className={styles.label}>Résumé</label>
        <textarea className={styles.textarea} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
      </div>
      <div className={styles.field} style={{ marginBottom: 10 }}>
        <label className={styles.label}>Notes</label>
        <textarea className={styles.textarea} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      {error ? <span className={styles.fileError}>{error}</span> : null}
      <div className={styles.submitRow}>
        <button type="submit" className={styles.submitBtn}>
          Enregistrer
        </button>
        <button type="button" className={styles.deleteBtn} onClick={onCancel}>
          Annuler
        </button>
      </div>
    </form>
  );
}
