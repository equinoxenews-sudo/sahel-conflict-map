"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CloudError,
  deleteCloud,
  listCloud,
  listCloudVersions,
  pullDossier,
  pushDossier,
  unlockCloud,
  type CloudDossier,
  type CloudErrorCode,
  type CloudVersion,
} from "@/lib/investigation/cloudSync";
import { useInvestigationStorage } from "@/lib/investigation/InvestigationContext";
import styles from "./CloudSyncPanel.module.css";

type Status = "idle" | "loading" | "ready" | CloudErrorCode;

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

interface Row {
  id: string;
  name: string;
  local: { entities: number; notes: number; updatedAt: string } | null;
  remote: CloudDossier | null;
}

// Copie en ligne des dossiers (solution temporaire, voir lib/investigation/cloudSync.ts).
export default function CloudSyncPanel() {
  const storage = useInvestigationStorage();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [remote, setRemote] = useState<CloudDossier[]>([]);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<{ id: string; label: string } | null>(null);
  const [version, setVersion] = useState(0);
  const [history, setHistory] = useState<{ id: string; versions: CloudVersion[] } | null>(null);

  // Les dossiers de cet appareil : relus à chaque ouverture et après une récupération.
  const rows = useMemo<Row[]>(() => {
    void version;
    const data = storage.load();
    const byId = new Map<string, Row>();
    for (const dossier of data.dossiers) {
      byId.set(dossier.id, {
        id: dossier.id,
        name: dossier.name,
        local: {
          entities: data.entities.filter((e) => e.dossierId === dossier.id).length,
          notes: data.notes.filter((n) => n.dossierId === dossier.id).length,
          updatedAt: dossier.updatedAt,
        },
        remote: null,
      });
    }
    for (const cloud of remote) {
      const existing = byId.get(cloud.id);
      if (existing) existing.remote = cloud;
      else byId.set(cloud.id, { id: cloud.id, name: cloud.name, local: null, remote: cloud });
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [storage, remote, version]);

  // keepMessage : après un envoi ou une récupération, le message de confirmation reste affiché.
  const refresh = useCallback(async (keepMessage = false) => {
    setStatus((current) => (current === "ready" ? current : "loading"));
    if (!keepMessage) setMessage(null);
    try {
      setRemote(await listCloud());
      setStatus("ready");
    } catch (error) {
      const failure = error instanceof CloudError ? error : new CloudError(String(error), "error");
      setStatus(failure.code);
      setMessage(failure.code === "locked" ? null : failure.message);
    }
  }, []);

  useEffect(() => {
    if (open && status === "idle") {
      const timer = window.setTimeout(() => void refresh(), 0);
      return () => window.clearTimeout(timer);
    }
  }, [open, status, refresh]);

  async function handleUnlock(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    try {
      await unlockCloud(password);
      setPassword("");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Mot de passe incorrect.");
    }
  }

  async function handlePush(row: Row) {
    if (!row.local) return;
    const localContent = row.local.entities + row.local.notes;
    const remoteContent = row.remote ? row.remote.entityCount + row.remote.noteCount : 0;
    if (localContent === 0 && remoteContent > 0) {
      window.alert(
        `Envoi annulé : « ${row.name} » est vide sur cet appareil alors que la copie en ligne contient ${row.remote?.entityCount} fiche(s) et ${row.remote?.noteCount} note(s). L'envoyer l'effacerait. Récupère d'abord la copie en ligne.`,
      );
      return;
    }
    if (row.remote && !window.confirm(`Remplacer la copie en ligne de « ${row.name} » par la version de cet appareil ?`)) return;
    setMessage(null);
    setBusy({ id: row.id, label: "Envoi…" });
    try {
      await pushDossier(storage, row.id, (done, total) =>
        setBusy({ id: row.id, label: total > 1 ? `Envoi ${Math.min(done + 1, total)}/${total}…` : "Envoi…" }),
      );
      await refresh(true);
      setMessage(`« ${row.name} » est enregistré en ligne.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Envoi impossible.");
    } finally {
      setBusy(null);
    }
  }

  async function handlePull(row: Row) {
    if (!row.remote) return;
    const localContent = row.local ? row.local.entities + row.local.notes : 0;
    if (row.local && localContent > 0 && row.remote.entityCount + row.remote.noteCount === 0) {
      window.alert(
        `Récupération annulée : la copie en ligne de « ${row.name} » est vide, alors que cet appareil contient ${row.local.entities} fiche(s) et ${row.local.notes} note(s). La récupérer les effacerait. Envoie plutôt la version de cet appareil.`,
      );
      return;
    }
    if (row.local && !window.confirm(`Remplacer la version de « ${row.name} » sur cet appareil par la copie en ligne ? Les modifications faites ici et non envoyées seront perdues.`)) return;
    setMessage(null);
    setBusy({ id: row.id, label: "Récupération…" });
    try {
      await pullDossier(storage, row.id, (done, total) =>
        setBusy({ id: row.id, label: total > 1 ? `Récupération ${Math.min(done + 1, total)}/${total}…` : "Récupération…" }),
      );
      setVersion((value) => value + 1);
      setMessage(`« ${row.name} » est à jour sur cet appareil.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Récupération impossible.");
    } finally {
      setBusy(null);
    }
  }

  async function handleHistory(row: Row) {
    if (history?.id === row.id) {
      setHistory(null);
      return;
    }
    setMessage(null);
    setBusy({ id: row.id, label: "Historique…" });
    try {
      setHistory({ id: row.id, versions: await listCloudVersions(row.id) });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Historique indisponible.");
    } finally {
      setBusy(null);
    }
  }

  async function handleRestoreVersion(row: Row, target: CloudVersion) {
    const when = dateFormat.format(new Date(target.createdAt));
    if (!window.confirm(`Remplacer la version de « ${row.name} » sur cet appareil par la version en ligne du ${when} ?

La version actuelle de cet appareil est d'abord mise de côté (onglet Sauvegardes du dossier). Elle sera ensuite renvoyée en ligne comme nouvelle version.`)) return;
    setMessage(null);
    setBusy({ id: row.id, label: "Récupération…" });
    try {
      await pullDossier(storage, row.id, undefined, target.uploadId);
      setVersion((value) => value + 1);
      setMessage(`« ${row.name} » est revenu à la version du ${when}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Récupération impossible.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDeleteRemote(row: Row) {
    if (!row.remote) return;
    if (!window.confirm(`Supprimer la copie en ligne de « ${row.name} » ? (Le dossier reste sur les appareils où il est.)`)) return;
    setMessage(null);
    setBusy({ id: row.id, label: "Suppression…" });
    try {
      await deleteCloud(row.id);
      await refresh(true);
      setMessage(`La copie en ligne de « ${row.name} » est retirée.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Suppression impossible.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={styles.panel}>
      <button type="button" className={styles.toggle} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className={styles.toggleTitle}>Synchronisation entre appareils</span>
        <span className={styles.badge}>temporaire</span>
        <span className={styles.chevron} aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open ? (
        <div className={styles.body}>
          <p className={styles.intro}>
            Tes dossiers vivent dans ce navigateur et sont copiés en ligne automatiquement. Ici, tu peux forcer un envoi,
            les récupérer sur un autre appareil ou revenir à une version plus ancienne. Les copies en ligne sont protégées par le mot de passe
            d&apos;administration.
          </p>

          {status === "loading" || status === "idle" ? <p className={styles.note}>Connexion…</p> : null}

          {status === "locked" ? (
            <form className={styles.unlock} onSubmit={handleUnlock}>
              <input
                className={styles.input}
                type="password"
                autoComplete="current-password"
                placeholder="Mot de passe"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button type="submit" className={styles.primary} disabled={!password}>
                Déverrouiller
              </button>
            </form>
          ) : null}

          {status === "not_configured" || status === "no_tables" || status === "error" ? (
            <p className={styles.error}>{message}</p>
          ) : null}
          {status === "locked" && message ? <p className={styles.error}>{message}</p> : null}

          {status === "ready" ? (
            <>
              {message ? <p className={styles.note}>{message}</p> : null}
              {rows.length === 0 ? <p className={styles.note}>Aucun dossier pour l&apos;instant.</p> : null}
              <ul className={styles.list}>
                {rows.map((row) => {
                  const working = busy?.id === row.id;
                  return (
                    <li key={row.id} className={styles.row}>
                      <div className={styles.rowMain}>
                        <span className={styles.name}>{row.name}</span>
                        <span className={styles.detail}>
                          Cet appareil :{" "}
                          {row.local ? `${row.local.entities} fiche(s) · ${row.local.notes} note(s)` : "absent"}
                        </span>
                        <span className={styles.detail}>
                          En ligne :{" "}
                          {row.remote
                            ? `envoyé le ${dateFormat.format(new Date(row.remote.uploadedAt))} · ${row.remote.entityCount} fiche(s) · ${formatBytes(row.remote.bytes)}`
                            : "absent"}
                        </span>
                      </div>
                      <div className={styles.actions}>
                        {working ? <span className={styles.busy}>{busy?.label}</span> : null}
                        {row.local ? (
                          <button type="button" className={styles.button} disabled={busy !== null} onClick={() => void handlePush(row)}>
                            Envoyer
                          </button>
                        ) : null}
                        {row.remote ? (
                          <button type="button" className={styles.button} disabled={busy !== null} onClick={() => void handlePull(row)}>
                            Récupérer
                          </button>
                        ) : null}
                        {row.remote ? (
                          <button type="button" className={styles.ghost} disabled={busy !== null} onClick={() => void handleHistory(row)}>
                            {history?.id === row.id ? "Masquer l'historique" : "Historique"}
                          </button>
                        ) : null}
                        {row.remote ? (
                          <button type="button" className={styles.ghost} disabled={busy !== null} onClick={() => void handleDeleteRemote(row)}>
                            Retirer d&apos;en ligne
                          </button>
                        ) : null}
                      </div>
                      {history?.id === row.id ? (
                        <ul className={styles.list}>
                          {history.versions.map((entry) => (
                            <li key={entry.uploadId} className={styles.row}>
                              <span className={styles.detail}>
                                {dateFormat.format(new Date(entry.createdAt))}
                                {entry.current ? " · version actuelle" : ""}
                              </span>
                              {entry.current ? null : (
                                <button type="button" className={styles.button} disabled={busy !== null} onClick={() => void handleRestoreVersion(row, entry)}>
                                  Revenir à cette version
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              <p className={styles.hint}>
                « Envoyer » remplace la copie en ligne ; « Récupérer » remplace la version de cet appareil. Les deux
                demandent confirmation. Pas de fusion automatique : envoie depuis l&apos;appareil où tu as travaillé en
                dernier.
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
