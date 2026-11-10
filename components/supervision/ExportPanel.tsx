"use client";

import { useState } from "react";
import { capabilities, isState } from "@/lib/supervision/core/lifecycle";
import { EXPORT_PERIODS, type ExportPeriod } from "@/lib/supervision/export/report";
import styles from "./Supervision.module.css";

// Export PDF d'UNE Supervision : un rapport (périmètre, alertes, publications, sources, limites) généré côté serveur à partir de ce que le
// tableau de bord sait déjà. Sans IA, aucun coût. Les notes personnelles ne sont incluses que si on le demande.

const UNAVAILABLE: Record<string, string> = {
  draft: "L'export est disponible une fois la Supervision activée : il n'y a rien à exporter avant la première collecte.",
  deleted: "Cette Supervision n'existe plus.",
};

function problemText(code: string | undefined): string {
  switch (code) {
    case "export_unavailable":
      return "L'export n'est pas disponible dans l'état actuel de cette Supervision.";
    case "data_unavailable":
      return "Les données de la Supervision sont momentanément indisponibles : réessaie dans un instant.";
    case "not_found":
      return "Cette Supervision est introuvable.";
    case "locked":
      return "Connexion requise.";
    default:
      return "L'export a échoué. Réessaie dans un instant.";
  }
}

function filenameOf(header: string | null): string {
  const match = header?.match(/filename\*=UTF-8''([^;]+)/i);
  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      /* nom illisible : repli ci-dessous */
    }
  }
  return "supervision-rapport.pdf";
}

export default function ExportPanel({ id, state }: { id: string; state: string }) {
  const [days, setDays] = useState<ExportPeriod>(30);
  const [notes, setNotes] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const allowed = isState(state) && capabilities(state).export;

  async function download() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/supervision/${id}/export/pdf?days=${days}${notes ? "&notes=1" : ""}`, { cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setMessage({ tone: "error", text: problemText(body.code) });
        return;
      }
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = filenameOf(response.headers.get("Content-Disposition"));
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
      setMessage({ tone: "ok", text: `Rapport généré (${Math.max(1, Math.round(blob.size / 1024))} Ko).` });
    } catch {
      setMessage({ tone: "error", text: "Export impossible : réseau indisponible." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.history} style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", alignItems: "center" }}>
        <strong>Exporter</strong>
        {allowed ? (
          <>
            <span className={styles.muted}>Rapport PDF : périmètre, alertes, publications, sources et limites. Sans IA, aucun coût.</span>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              Période
              <select value={days} onChange={(event) => setDays(Number(event.target.value) as ExportPeriod)} disabled={busy} aria-label="Période du rapport">
                {EXPORT_PERIODS.map((period) => (
                  <option key={period} value={period}>{period} jours</option>
                ))}
              </select>
            </label>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={notes} onChange={(event) => setNotes(event.target.checked)} disabled={busy} />
              Inclure mes notes
            </label>
            <button type="button" className={styles.primary} onClick={() => void download()} disabled={busy}>
              {busy ? "Génération…" : "Télécharger le PDF"}
            </button>
          </>
        ) : (
          <span className={styles.muted}>{UNAVAILABLE[state] ?? "L'export n'est pas disponible dans l'état actuel de cette Supervision."}</span>
        )}
      </div>
      {message ? (
        <p className={message.tone === "error" ? styles.error : styles.muted} role={message.tone === "error" ? "alert" : "status"} style={{ marginTop: 6 }}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
