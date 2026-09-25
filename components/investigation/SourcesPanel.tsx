"use client";

import { useState, type FormEvent } from "react";
import { CLAIM_TYPE_LABELS, type ClaimType } from "@/lib/investigation/types";
import { useInvestigationStorage, useSources } from "@/lib/investigation/InvestigationContext";
import styles from "./SourcesPanel.module.css";

interface SourcesPanelProps {
  dossierId: string;
}

const CLAIM_CLASS: Record<ClaimType, string> = {
  observed: styles.claimObserved,
  hypothesis: styles.claimHypothesis,
  conclusion: styles.claimConclusion,
};

const emptyForm = {
  title: "",
  url: "",
  platform: "",
  publishedAt: "",
  summary: "",
  tags: "",
  reliability: "3",
  notes: "",
  claimType: "observed" as ClaimType,
};

export default function SourcesPanel({ dossierId }: SourcesPanelProps) {
  const sources = useSources(dossierId);
  const storage = useInvestigationStorage();
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim()) return;
    storage.addSource({
      dossierId,
      title: form.title.trim(),
      url: form.url.trim(),
      platform: form.platform.trim(),
      publishedAt: form.publishedAt || null,
      collectedAt: new Date().toISOString(),
      summary: form.summary.trim(),
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      reliability: Number(form.reliability) as 1 | 2 | 3 | 4 | 5,
      notes: form.notes.trim(),
      claimType: form.claimType,
    });
    setForm(emptyForm);
  }

  const filtered = sources.filter((s) => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return true;
    return (
      s.title.toLowerCase().includes(needle) ||
      s.summary.toLowerCase().includes(needle) ||
      s.tags.some((t) => t.toLowerCase().includes(needle))
    );
  });

  const sorted = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className={styles.wrap}>
      <form className={styles.formCard} onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Titre</label>
            <input
              className={styles.input}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>URL</label>
            <input
              className={styles.input}
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Plateforme</label>
            <input
              className={styles.input}
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
              placeholder="Telegram, presse, registre..."
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Date de publication</label>
            <input
              className={styles.input}
              type="date"
              value={form.publishedAt}
              onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Fiabilité (1-5)</label>
            <select
              className={styles.select}
              value={form.reliability}
              onChange={(e) => setForm({ ...form, reliability: e.target.value })}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Statut</label>
            <select
              className={styles.select}
              value={form.claimType}
              onChange={(e) => setForm({ ...form, claimType: e.target.value as ClaimType })}
            >
              {(Object.keys(CLAIM_TYPE_LABELS) as ClaimType[]).map((c) => (
                <option key={c} value={c}>
                  {CLAIM_TYPE_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Tags (séparés par virgule)</label>
            <input
              className={styles.input}
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </div>
        </div>
        <div className={styles.field} style={{ marginBottom: 10 }}>
          <label className={styles.label}>Résumé</label>
          <textarea
            className={styles.textarea}
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
          />
        </div>
        <div className={styles.field} style={{ marginBottom: 10 }}>
          <label className={styles.label}>Notes</label>
          <textarea
            className={styles.textarea}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <div className={styles.submitRow}>
          <button type="submit" className={styles.submitBtn}>
            Ajouter la source
          </button>
        </div>
      </form>

      <div className={styles.filterRow}>
        <input
          className={styles.filterInput}
          placeholder="Filtrer par titre, résumé ou tag..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {sorted.length === 0 ? (
        <div className={styles.emptyState}>Aucune source pour l&apos;instant.</div>
      ) : (
        <div className={styles.list}>
          {sorted.map((s) => (
            <div key={s.id} className={styles.sourceCard}>
              <div className={styles.sourceHead}>
                <div>
                  <div className={styles.sourceTitle}>{s.title}</div>
                  <a className={styles.sourceUrl} href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.url}
                  </a>
                </div>
                <span className={`${styles.claimTag} ${CLAIM_CLASS[s.claimType]}`}>
                  {CLAIM_TYPE_LABELS[s.claimType]}
                </span>
              </div>
              <div className={styles.sourceMeta}>
                {s.platform && <span>{s.platform}</span>}
                <span>Fiabilité {s.reliability}/5</span>
                {s.publishedAt && <span>Publié le {s.publishedAt}</span>}
                <span>Collecté le {new Date(s.collectedAt).toLocaleDateString("fr-FR")}</span>
              </div>
              {s.summary && <div className={styles.sourceSummary}>{s.summary}</div>}
              {s.tags.length > 0 && (
                <div className={styles.tags}>
                  {s.tags.map((t) => (
                    <span key={t} className={styles.tag}>
                      #{t}
                    </span>
                  ))}
                </div>
              )}
              <button type="button" className={styles.deleteBtn} onClick={() => storage.deleteSource(s.id)}>
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
