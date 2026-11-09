"use client";

import { useCallback, useRef, useState } from "react";
import { emptyState, parseState, serializeState, type LabState } from "@/lib/supervision/dashboard/state";
import DashboardShell, { type ShellStatus } from "./DashboardShell";

// Prototype du Lot 2 (/supervision-lab) : l'éditeur avec des données FICTIVES et une sauvegarde dans le navigateur. Le vrai tableau de
// bord (enregistré sur le serveur, rattaché à une Supervision) est dans SupervisionBoard.tsx.

// Clé gardée telle quelle pour ne pas perdre les dispositions enregistrées pendant la comparaison des moteurs.
const STORAGE_KEY = "equinoxe-supervision-lab-v1-rgl";
const SAVE_DELAY_MS = 600;

function loadState(): LabState {
  try {
    return parseState(window.localStorage.getItem(STORAGE_KEY)) ?? emptyState();
  } catch {
    return emptyState();
  }
}

export default function LabShell() {
  const [initial, setInitial] = useState<LabState>(() => loadState());
  const [generation, setGeneration] = useState(0);
  const [status, setStatus] = useState<ShellStatus>({ kind: "saved", at: 0, message: "Enregistrement automatique (ce navigateur)" });
  const timer = useRef<number | undefined>(undefined);

  const onStateChange = useCallback((state: LabState) => {
    setStatus({ kind: "pending", at: 0 });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, serializeState(state));
      } catch {
        /* stockage indisponible : la démonstration continue sans sauvegarde */
      }
      setStatus({ kind: "saved", at: Date.now() });
    }, SAVE_DELAY_MS);
  }, []);

  return (
    <DashboardShell
      key={generation}
      initialState={initial}
      onStateChange={onStateChange}
      status={status}
      badge="Prototype Lot 2"
      samples
      onReload={() => {
        setInitial(loadState());
        setGeneration((n) => n + 1);
      }}
    />
  );
}
