"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  decideAutoSave,
  dossierContentCount,
  dossierSignature,
  ignoreRemoteDossier,
  readIgnoredRemote,
  readSyncBases,
} from "@/lib/investigation/autoSave";
import { CloudError, listCloud, pullDossier, pushDossier, type CloudDossier } from "@/lib/investigation/cloudSync";
import { useInvestigationData, useInvestigationStorage } from "@/lib/investigation/InvestigationContext";
import styles from "./CloudAutoSave.module.css";

/** Délai après la dernière modification avant l'envoi : une rafale de changements ne fait qu'un envoi. */
const SAVE_DELAY_MS = 45_000;
const FIRST_CHECK_MS = 1_500;

type Status =
  | { kind: "checking" }
  | { kind: "saving"; name: string }
  | { kind: "saved"; at: Date }
  | { kind: "pending" }
  | { kind: "error"; message: string }
  | { kind: "off"; message: string };

interface Conflict {
  id: string;
  name: string;
  remote: CloudDossier;
}

const timeFormat = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const dateTimeFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Sauvegarde en ligne automatique des dossiers (même copie que « Synchronisation entre appareils »).
// Les dossiers du compte se retrouvent tout seuls sur n'importe quel appareil : à l'ouverture, ceux qui sont en ligne
// et absents ici sont récupérés, et ceux que cet appareil n'a pas modifiés sont mis à jour. Elle n'écrase jamais une
// copie en ligne plus récente que celle dont cet appareil est parti si cet appareil a lui aussi changé, ni une copie
// pleine par un dossier vide : dans ces cas elle demande, et ne touche à rien d'ici là.
export default function CloudAutoSave() {
  const storage = useInvestigationStorage();
  const data = useInvestigationData();
  const [status, setStatus] = useState<Status>({ kind: "checking" });
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [missing, setMissing] = useState<CloudDossier[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const running = useRef(false);
  const again = useRef(false);
  const dismissed = useRef(new Set<string>());
  const disabled = useRef(false);

  const run = useCallback(async () => {
    if (disabled.current) return;
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    try {
      let remote: CloudDossier[];
      try {
        remote = await listCloud();
      } catch (error) {
        const failure = error instanceof CloudError ? error : new CloudError(String(error), "error");
        if (failure.code === "not_configured" || failure.code === "no_tables") {
          disabled.current = true;
          setStatus({ kind: "off", message: failure.message });
        } else {
          setStatus({ kind: "error", message: failure.code === "locked" ? "mot de passe requis, recharge la page" : failure.message });
        }
        return;
      }

      const snapshot = storage.load();
      const bases = readSyncBases();
      const nextConflicts: Conflict[] = [];
      let saved = false;
      for (const dossier of snapshot.dossiers) {
        const info = remote.find((item) => item.id === dossier.id);
        const decision = decideAutoSave({
          signature: dossierSignature(snapshot, dossier.id),
          contentCount: dossierContentCount(snapshot, dossier.id),
          base: bases[dossier.id],
          remote: info,
        });
        if (decision === "conflict" && info) nextConflicts.push({ id: dossier.id, name: dossier.name, remote: info });
        if (decision === "pull") {
          setStatus({ kind: "saving", name: dossier.name });
          try {
            await pullDossier(storage, dossier.id);
            saved = true;
          } catch {
            // Récupération impossible pour l'instant : le dossier reste tel quel et sera retenté à la prochaine vérification.
          }
        }
        if (decision === "push") {
          setStatus({ kind: "saving", name: dossier.name });
          try {
            await pushDossier(storage, dossier.id);
            saved = true;
          } catch (error) {
            setStatus({ kind: "error", message: error instanceof Error ? error.message : "envoi impossible" });
            return;
          }
        }
      }
      const ignored = readIgnoredRemote();
      setConflicts(nextConflicts.filter((conflict) => !dismissed.current.has(conflict.id)));
      // Dossiers en ligne absents de cet appareil : récupérés sans rien demander. Ceux qui échouent restent proposés à la main.
      const stillMissing: CloudDossier[] = [];
      for (const item of remote) {
        if (snapshot.dossiers.some((dossier) => dossier.id === item.id) || ignored.includes(item.id)) continue;
        setStatus({ kind: "saving", name: item.name });
        try {
          await pullDossier(storage, item.id);
          saved = true;
        } catch {
          stillMissing.push(item);
        }
      }
      setMissing(stillMissing);
      if (nextConflicts.length > 0) setStatus({ kind: "pending" });
      else if (saved || snapshot.dossiers.length > 0) setStatus((current) => (saved || current.kind !== "saved" ? { kind: "saved", at: new Date() } : current));
      else setStatus({ kind: "saved", at: new Date() });
    } finally {
      running.current = false;
      if (again.current) {
        again.current = false;
        void run();
      }
    }
  }, [storage]);

  // Vérification à l'ouverture, puis un envoi quelques dizaines de secondes après la dernière modification.
  useEffect(() => {
    const timer = window.setTimeout(() => void run(), FIRST_CHECK_MS);
    return () => window.clearTimeout(timer);
  }, [run]);
  useEffect(() => {
    const timer = window.setTimeout(() => void run(), SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [data, run]);

  async function restore(id: string, name: string, replaces: boolean) {
    if (
      replaces &&
      !window.confirm(
        `Remplacer la version de « ${name} » sur cet appareil par la copie en ligne ?\n\nLa version actuelle de cet appareil est d'abord mise de côté (onglet Sauvegardes du dossier).`
      )
    ) {
      return;
    }
    setBusyId(id);
    try {
      await pullDossier(storage, id);
      setConflicts((current) => current.filter((conflict) => conflict.id !== id));
      setMissing((current) => current.filter((item) => item.id !== id));
      setStatus({ kind: "saved", at: new Date() });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "récupération impossible" });
    } finally {
      setBusyId(null);
    }
  }

  async function overwrite(conflict: Conflict) {
    if (
      !window.confirm(
        `Remplacer la copie en ligne de « ${conflict.name} » (envoyée le ${dateTimeFormat.format(new Date(conflict.remote.uploadedAt))}) par la version de cet appareil ?\n\nL'ancienne copie reste dans l'historique des versions en ligne pendant quelque temps.`
      )
    ) {
      return;
    }
    setBusyId(conflict.id);
    try {
      await pushDossier(storage, conflict.id);
      setConflicts((current) => current.filter((item) => item.id !== conflict.id));
      setStatus({ kind: "saved", at: new Date() });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "envoi impossible" });
    } finally {
      setBusyId(null);
    }
  }

  const label =
    status.kind === "checking"
      ? "Sauvegarde en ligne : vérification…"
      : status.kind === "saving"
        ? `Sauvegarde en ligne de « ${status.name} »…`
        : status.kind === "saved"
          ? `Enregistré en ligne à ${timeFormat.format(status.at)}`
          : status.kind === "pending"
            ? "Sauvegarde en ligne en attente de ta décision"
            : status.kind === "off"
              ? `Sauvegarde en ligne indisponible : ${status.message}`
              : `Sauvegarde en ligne impossible : ${status.message}`;
  const tone = status.kind === "error" || status.kind === "off" || status.kind === "pending" ? styles.warn : styles.ok;

  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <span className={`${styles.line} ${tone}`}>{label}</span>

      {conflicts.map((conflict) => (
        <div key={conflict.id} className={styles.alert}>
          <p>
            <strong>« {conflict.name} »</strong> : une copie en ligne que cet appareil n&apos;a jamais vue existe (envoyée le{" "}
            {dateTimeFormat.format(new Date(conflict.remote.uploadedAt))}, {conflict.remote.entityCount} fiche(s), {conflict.remote.noteCount} note(s)).
            Rien n&apos;est envoyé tant que tu n&apos;as pas choisi.
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} disabled={busyId !== null} onClick={() => void restore(conflict.id, conflict.name, true)}>
              Récupérer la copie en ligne
            </button>
            <button type="button" className={styles.button} disabled={busyId !== null} onClick={() => void overwrite(conflict)}>
              Garder cet appareil et remplacer en ligne
            </button>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => {
                dismissed.current.add(conflict.id);
                setConflicts((current) => current.filter((item) => item.id !== conflict.id));
              }}
            >
              Plus tard
            </button>
          </div>
        </div>
      ))}

      {missing.map((item) => (
        <div key={item.id} className={styles.alert}>
          <p>
            <strong>« {item.name} »</strong> est enregistré en ligne ({item.entityCount} fiche(s), {item.noteCount} note(s), envoyé le{" "}
            {dateTimeFormat.format(new Date(item.uploadedAt))}) mais absent de cet appareil.
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} disabled={busyId !== null} onClick={() => void restore(item.id, item.name, false)}>
              {busyId === item.id ? "Récupération…" : "Récupérer ce dossier"}
            </button>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => {
                ignoreRemoteDossier(item.id);
                setMissing((current) => current.filter((entry) => entry.id !== item.id));
              }}
            >
              Ne plus proposer
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
