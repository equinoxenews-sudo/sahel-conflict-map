"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./Supervision.module.css";

// Collecte de publications de CETTE Supervision (sans IA) : bouton « Actualiser », dernier passage et journal.

interface Run {
  id: string;
  trigger: "manual" | "scheduled";
  started_at: string;
  finished_at: string | null;
  status: "running" | "ok" | "partial" | "failed";
  stats: { queries?: number; failedQueries?: number; fetched?: number; matched?: number; newItems?: number; newMatches?: number; rejected?: number; rejectedTopic?: number; located?: number; locationAvailable?: boolean } | null;
  error: string | null;
}

const STATUS_LABEL: Record<Run["status"], string> = { running: "en cours", ok: "réussie", partial: "partielle", failed: "échec" };
const timeFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function describe(run: Run): string {
  const s = run.stats ?? {};
  if (run.status === "running") return "Collecte en cours…";
  if (run.status === "failed") return run.error ?? "La collecte a échoué.";
  const parts = [`${s.matched ?? 0} publication${(s.matched ?? 0) > 1 ? "s" : ""} retenue${(s.matched ?? 0) > 1 ? "s" : ""}`, `${s.newMatches ?? 0} nouvelle${(s.newMatches ?? 0) > 1 ? "s" : ""}`];
  if ((s.rejectedTopic ?? 0) > 0) parts.push(`${s.rejectedTopic} écartée${(s.rejectedTopic ?? 0) > 1 ? "s" : ""} : sujet sans fait`);
  if (s.locationAvailable) parts.push(`${s.located ?? 0} localisée${(s.located ?? 0) > 1 ? "s" : ""}`);
  if ((s.failedQueries ?? 0) > 0) parts.push(`${s.failedQueries} recherche${(s.failedQueries ?? 0) > 1 ? "s" : ""} sans réponse sur ${s.queries ?? "?"}`);
  return parts.join(" · ");
}

export default function CollectPanel({ id, onCollected }: { id: string; onCollected: () => void }) {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [ready, setReady] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/supervision/${id}/collect`, { cache: "no-store" });
      if (!response.ok) return;
      const body = await response.json();
      setReady(body.ready !== false);
      setRuns(body.runs as Run[]);
    } catch {
      /* le journal est secondaire : sans lui, le tableau reste utilisable */
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/supervision/${id}/collect`, { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const body = await response.json();
        if (cancelled) return;
        setReady(body.ready !== false);
        setRuns(body.runs as Run[]);
      } catch {
        /* idem */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function collect() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/supervision/${id}/collect`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (response.ok) {
        setMessage(body.status === "partial" ? "Collecte partielle : certaines recherches n'ont rien rendu." : "Collecte terminée.");
        onCollected();
      } else if (body.code === "too_soon") {
        const minutes = Math.max(1, Math.ceil((body.retry_after_seconds ?? 60) / 60));
        setMessage(`Une collecte a déjà eu lieu récemment : réessaie dans ${minutes} min.`);
      } else if (body.code === "already_running") {
        setMessage("Une collecte est déjà en cours.");
      } else if (body.code === "no_queries") {
        setMessage("Cette zone n'est pas encore prise en charge par la collecte.");
      } else if (body.code === "read_only") {
        setMessage("Cette Supervision est en lecture seule.");
      } else {
        setMessage("La collecte a échoué. Réessaie dans quelques minutes.");
      }
    } catch {
      setMessage("Collecte impossible : réseau indisponible.");
    } finally {
      setBusy(false);
      void load();
    }
  }

  const last = runs?.find((run) => run.status !== "running") ?? null;
  return (
    <div className={styles.history} style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", alignItems: "center" }}>
        <button type="button" className={styles.primary} onClick={() => void collect()} disabled={busy || !ready}>
          {busy ? "Collecte en cours…" : "Actualiser la collecte"}
        </button>
        <span className={styles.muted}>
          {!ready
            ? "Collecte non installée dans cette base."
            : last
              ? `Dernière collecte : ${timeFormat.format(new Date(last.started_at))} — ${describe(last)}`
              : "Aucune collecte pour l'instant : les modules n'affichent que l'échantillon public."}
        </span>
        {runs && runs.length > 0 ? (
          <button type="button" onClick={() => setOpen((value) => !value)} style={{ background: "none", border: 0, color: "var(--accent-gold-bright, #e0b44c)", cursor: "pointer", padding: 0, fontSize: 13 }}>
            {open ? "Masquer le journal" : "Journal de collecte"}
          </button>
        ) : null}
      </div>
      {message ? <p className={styles.muted} role="status" style={{ marginTop: 6 }}>{message}</p> : null}
      <p className={styles.muted} style={{ marginTop: 6 }}>Recherche dans la presse publique (Google Actualités), sans IA : aucun coût. Les publications sont rattachées selon des règles écrites, pas par un modèle.</p>
      {open && runs ? (
        <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
          {runs.map((run) => (
            <li key={run.id} style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px" }}>
              <span>{timeFormat.format(new Date(run.started_at))}</span>
              <span className={styles.muted}>{run.trigger === "manual" ? "manuelle" : "planifiée"} · {STATUS_LABEL[run.status]}</span>
              <span className={styles.muted}>{describe(run)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
