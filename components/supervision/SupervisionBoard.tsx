"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BoardEvent } from "@/lib/supervision/dashboard/fixtures";
import { extractArea, type DataContext } from "@/lib/supervision/dashboard/geo";
import { emptyState, parseState, type LabState } from "@/lib/supervision/dashboard/state";
import CollectPanel from "./CollectPanel";
import LifecyclePanel from "./LifecyclePanel";
import { NotesScopeContext, useNotesScopeValue } from "./NotesPanel";
import ScopePanel from "./ScopePanel";
import DashboardShell, { type ShellStatus } from "./DashboardShell";
import { STATE_LABELS } from "./SupervisionList";
import styles from "./Supervision.module.css";

// Tableau de bord d'une Supervision, ENREGISTRÉ SUR LE SERVEUR avec contrôle de révision :
//  - chaque modification est enregistrée après 0,8 s de calme, avec la révision que ce navigateur a lue ;
//  - si le serveur en a une plus récente (autre onglet, autre appareil), RIEN n'est écrasé : on propose de charger la version du
//    serveur ou de garder la sienne ;
//  - les dernières révisions sont consultables et restaurables ;
//  - à la fermeture de l'onglet, une dernière sauvegarde est tentée, et le navigateur prévient s'il reste des modifications non enregistrées.

const SAVE_DELAY_MS = 800;
const RETRY_MS = 4000;

interface SupervisionInfo {
  id: string;
  name: string;
  state: string;
}

interface Loaded {
  supervision: SupervisionInfo;
  dashboard: { revision: number; state: LabState | null };
}

/** Réponse de /api/supervision/[id]/data. */
interface BoardPayload {
  events: BoardEvent[];
  countries: { iso3: string; name: string }[];
  coverage: { articles: number; signals: number; publications: number; merged: number; earliest: string | null; latest: string | null; truncated: boolean; method: string };
  sample: boolean;
}

type DataState = { status: "loading" } | { status: "error" } | { status: "ready"; payload: BoardPayload; context: DataContext };

interface Conflict {
  currentRevision: number;
  currentState: LabState | null;
}

const dayFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const timeFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });

function toState(value: unknown): LabState | null {
  return value ? parseState(JSON.stringify(value)) : null;
}

export default function SupervisionBoard({ id }: { id: string }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DataState>({ status: "loading" });

  // Événements réels du périmètre (lecture seule côté serveur) et contour du pays pour le fond de carte. Un échec ici n'empêche pas
  // de disposer le tableau : les modules affichent alors « données indisponibles ».
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/supervision/${id}/data`, { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        const payload = (await response.json()) as BoardPayload;
        let area = null;
        if (payload.countries.length > 0) {
          const geo = await fetch("/data/world-countries.geo.json").then((r) => (r.ok ? r.json() : null)).catch(() => null);
          area = geo ? extractArea(geo, payload.countries.map((country) => country.iso3)) : null;
        }
        if (!cancelled) setData({ status: "ready", payload, context: { area, latest: payload.coverage.latest, total: payload.events.length } });
      } catch {
        if (!cancelled) setData({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);
  /** Recharge les événements sans vider l'écran (après une collecte). */
  const refreshData = () => setAttempt((n) => n + 1);
  const retryData = () => {
    setData({ status: "loading" });
    setAttempt((n) => n + 1);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/supervision/${id}`, { cache: "no-store" });
        const body = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setError(body.code === "not_found" ? "Supervision introuvable." : (body.error ?? "Chargement impossible."));
          return;
        }
        setLoaded({ supervision: body.supervision, dashboard: { revision: body.dashboard.revision, state: toState(body.dashboard.state) } });
      } catch {
        if (!cancelled) setError("Chargement impossible : réseau indisponible.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className={styles.page}>
        <Link href="/mon-espace/supervision" className={styles.back}>← Mes Supervisions</Link>
        <p className={styles.error} role="alert">{error}</p>
      </div>
    );
  }
  if (!loaded) {
    return (
      <div className={styles.page}>
        <p className={styles.muted}>Chargement du tableau de bord…</p>
      </div>
    );
  }
  const changeState = (state: string) => setLoaded((current) => (current ? { ...current, supervision: { ...current.supervision, state } } : current));
  return <Editor supervision={loaded.supervision} initialRevision={loaded.dashboard.revision} initialState={loaded.dashboard.state ?? emptyState()} data={data} onRetryData={retryData} onRefreshData={refreshData} onSupervisionState={changeState} />;
}

const NO_EVENTS: BoardEvent[] = [];
const NO_DATA: DataContext = { area: null, latest: null, total: 0 };

function Editor({ supervision, initialRevision, initialState, data, onRetryData, onRefreshData, onSupervisionState }: { supervision: SupervisionInfo; initialRevision: number; initialState: LabState; data: DataState; onRetryData: () => void; onRefreshData: () => void; onSupervisionState: (state: string) => void }) {
  // Identités stables : tant que les données ne changent pas, aucun module n'est redessiné.
  const events = useMemo(() => (data.status === "ready" ? data.payload.events : NO_EVENTS), [data]);
  const context = useMemo(() => (data.status === "ready" ? data.context : NO_DATA), [data]);
  const [shell, setShell] = useState<{ key: number; state: LabState }>({ key: 0, state: initialState });
  const [status, setStatus] = useState<ShellStatus>({ kind: "saved", at: 0, message: initialRevision > 0 ? "Version enregistrée chargée" : "Tableau vierge : rien d'enregistré pour l'instant" });
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [history, setHistory] = useState<{ revision: number; savedAt: string }[] | null>(null);
  const notesScope = useNotesScopeValue(supervision.id, supervision.state === "read_only_grace" || supervision.state === "pending_deletion");

  const revisionRef = useRef(initialRevision);
  const latestRef = useRef<LabState | null>(null);
  const savingRef = useRef(false);
  const conflictRef = useRef(false);
  const readOnlyRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);
  const flushRef = useRef<(keepalive?: boolean) => Promise<void>>(async () => {});

  const flush = useCallback(
    async (keepalive = false) => {
      if (savingRef.current || conflictRef.current || readOnlyRef.current || !latestRef.current) return;
      const state = latestRef.current;
      latestRef.current = null;
      savingRef.current = true;
      setStatus({ kind: "saving", at: 0 });
      let again = false;
      const retryLater = () => {
        latestRef.current = latestRef.current ?? state;
        timerRef.current = window.setTimeout(() => void flushRef.current(), RETRY_MS);
      };
      try {
        const response = await fetch(`/api/supervision/${supervision.id}/dashboard`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expectedRevision: revisionRef.current, state }),
          keepalive,
        });
        const body = await response.json().catch(() => ({}));
        if (response.ok) {
          revisionRef.current = body.revision;
          setStatus({ kind: "saved", at: Date.now() });
          again = latestRef.current !== null;
        } else if (response.status === 409 && body.code === "revision_conflict") {
          conflictRef.current = true;
          latestRef.current = latestRef.current ?? state; // ma version reste prête si je choisis de la garder
          setConflict({ currentRevision: body.currentRevision, currentState: toState(body.currentState) });
          setStatus({ kind: "conflict", at: 0 });
        } else if (body.code === "read_only") {
          readOnlyRef.current = true;
          setStatus({ kind: "readonly", at: 0 });
        } else if (response.status >= 500 || response.status === 429) {
          setStatus({ kind: "error", at: 0 });
          retryLater();
        } else {
          setStatus({ kind: "error", at: 0, message: "Enregistrement refusé par le serveur : recharge la page." });
        }
      } catch {
        setStatus({ kind: "error", at: 0 });
        retryLater();
      } finally {
        savingRef.current = false;
      }
      if (again) void flushRef.current();
    },
    [supervision.id],
  );
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const onStateChange = useCallback(
    (state: LabState) => {
      latestRef.current = state;
      if (conflictRef.current || readOnlyRef.current) return;
      setStatus({ kind: "pending", at: 0 });
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => void flushRef.current(), SAVE_DELAY_MS);
    },
    [],
  );

  // Dernière tentative à la fermeture ou au passage en arrière-plan, et avertissement s'il reste des modifications non enregistrées.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && latestRef.current) void flushRef.current(true);
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (latestRef.current || savingRef.current || conflictRef.current) event.preventDefault();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.clearTimeout(timerRef.current);
    };
  }, []);

  /** Remplace ce que l'éditeur affiche (version du serveur, restauration) : on le remonte avec le nouvel état. */
  const replace = (state: LabState) => setShell((current) => ({ key: current.key + 1, state }));

  const useServerVersion = () => {
    if (!conflict) return;
    revisionRef.current = conflict.currentRevision;
    conflictRef.current = false;
    latestRef.current = null;
    setConflict(null);
    replace(conflict.currentState ?? emptyState());
    setStatus({ kind: "saved", at: Date.now(), message: "Version du serveur chargée" });
  };

  const keepMine = () => {
    if (!conflict) return;
    revisionRef.current = conflict.currentRevision;
    conflictRef.current = false;
    setConflict(null);
    void flush();
  };

  const reload = async () => {
    if ((latestRef.current || savingRef.current) && !window.confirm("Des modifications ne sont pas encore enregistrées : elles seront perdues. Recharger la version du serveur ?")) return;
    try {
      const response = await fetch(`/api/supervision/${supervision.id}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) return;
      window.clearTimeout(timerRef.current);
      latestRef.current = null;
      conflictRef.current = false;
      setConflict(null);
      revisionRef.current = body.dashboard.revision;
      replace(toState(body.dashboard.state) ?? emptyState());
      setStatus({ kind: "saved", at: Date.now(), message: "Version du serveur chargée" });
    } catch {
      setStatus({ kind: "error", at: 0, message: "Rechargement impossible : réseau indisponible." });
    }
  };

  const toggleHistory = async () => {
    if (history) {
      setHistory(null);
      return;
    }
    try {
      const response = await fetch(`/api/supervision/${supervision.id}/dashboard`, { cache: "no-store" });
      const body = await response.json();
      if (response.ok) setHistory(body.revisions);
    } catch {
      /* historique indisponible : sans conséquence pour le tableau */
    }
  };

  const restore = async (revision: number) => {
    if (conflictRef.current || readOnlyRef.current) return;
    try {
      const response = await fetch(`/api/supervision/${supervision.id}/dashboard?revision=${revision}`, { cache: "no-store" });
      const body = await response.json();
      const state = response.ok ? toState(body.state) : null;
      if (!state) return;
      replace(state);
      latestRef.current = state;
      setHistory(null);
      void flush();
    } catch {
      setStatus({ kind: "error", at: 0, message: "Restauration impossible : réseau indisponible." });
    }
  };

  const banner = (
    <>
      <LifecyclePanel
        id={supervision.id}
        state={supervision.state}
        onStateChange={(state) => {
          onSupervisionState(state);
          onRefreshData();
        }}
      />
      <ScopePanel id={supervision.id} onSaved={onRefreshData} />
      <CollectPanel key={supervision.state} id={supervision.id} onCollected={onRefreshData} blocked={supervision.state === "paused" ? "En pause : reprends la Supervision pour collecter." : supervision.state === "initializing" ? "Initialisation en cours." : null} />
      {conflict ? (
        <div className={styles.notice} role="alert">
          <strong>Ce tableau a été modifié ailleurs (autre onglet ou autre appareil). Rien n&apos;a été écrasé.</strong>
          <button type="button" onClick={useServerVersion}>Charger la version du serveur (mes modifications non enregistrées seront perdues)</button>
          <button type="button" onClick={keepMine}>Garder ma version (elle remplacera celle du serveur)</button>
        </div>
      ) : null}
      {supervision.state === "read_only_grace" || supervision.state === "pending_deletion" ? <div className={styles.notice} role="status"><strong>Cette Supervision est en lecture seule.</strong></div> : null}
      <p className={styles.muted} style={{ marginBottom: 8 }}>
        <button type="button" onClick={toggleHistory} style={{ background: "none", border: 0, color: "var(--accent-gold-bright, #e0b44c)", cursor: "pointer", padding: 0, fontSize: 13 }}>
          {history ? "Masquer l'historique" : "Historique des enregistrements"}
        </button>
      </p>
      {history ? (
        <div className={styles.history}>
          {history.length === 0 ? (
            "Aucun enregistrement pour l'instant."
          ) : (
            <>
              Les {history.length} dernières versions enregistrées. Restaurer une version l&apos;enregistre comme une nouvelle révision (rien n&apos;est perdu).
              <ul>
                {history.map((entry) => (
                  <li key={entry.revision}>
                    <span>Révision {entry.revision}</span>
                    <span className={styles.muted}>{timeFormat.format(new Date(entry.savedAt))}</span>
                    <button type="button" onClick={() => void restore(entry.revision)} style={{ cursor: "pointer" }}>Restaurer</button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </>
  );

  return (
    <div className={styles.page} style={{ maxWidth: "none", padding: 0 }}>
      <div style={{ maxWidth: 1480, margin: "0 auto", padding: "14px 16px 0" }}>
        <div className={styles.head}>
          <Link href="/mon-espace/supervision" className={styles.back}>← Mes Supervisions</Link>
          <h1>{supervision.name}</h1>
          <span className={styles.badge} data-state={supervision.state}>{STATE_LABELS[supervision.state] ?? supervision.state}</span>
        </div>
        <DataNotice data={data} onRetry={onRetryData} />
      </div>
      <NotesScopeContext.Provider value={notesScope}>
      <DashboardShell
        key={shell.key}
        initialState={shell.state}
        onStateChange={onStateChange}
        status={status}
        badge="Tableau de bord"
        onReload={() => void reload()}
        reloadLabel="Recharger la version du serveur"
        banner={banner}
        events={events}
        data={context}
      />
      </NotesScopeContext.Provider>
    </div>
  );
}

function DataNotice({ data, onRetry }: { data: DataState; onRetry: () => void }) {
  if (data.status === "loading") return <p className={styles.muted}>Chargement des événements du périmètre…</p>;
  if (data.status === "error") {
    return (
      <p className={styles.error} role="alert">
        Les données de cette Supervision sont momentanément indisponibles (le tableau reste modifiable).{" "}
        <button type="button" onClick={onRetry} style={{ cursor: "pointer" }}>Réessayer</button>
      </p>
    );
  }
  const { payload } = data;
  const { coverage } = payload;
  const where = payload.countries.map((country) => country.name).join(", ") || "aucun pays";
  return (
    <p className={styles.muted}>
      {payload.sample ? "Échantillon de données publiques du site. " : ""}
      {where} : {coverage.articles} article{coverage.articles > 1 ? "s" : ""} analysé{coverage.articles > 1 ? "s" : ""} et {coverage.signals} signalement{coverage.signals > 1 ? "s" : ""} médiatique{coverage.signals > 1 ? "s" : ""}{coverage.publications > 0 ? ` et ${coverage.publications} publication${coverage.publications > 1 ? "s" : ""} de presse collectée${coverage.publications > 1 ? "s" : ""}` : ""}
      {coverage.earliest && coverage.latest ? `, du ${dayFormat.format(new Date(coverage.earliest))} au ${dayFormat.format(new Date(coverage.latest))}` : ""}.
      {coverage.merged > 0 ? ` ${coverage.merged} entrée${coverage.merged > 1 ? "s" : ""} regroupée${coverage.merged > 1 ? "s" : ""} (même publication citée plusieurs fois).` : ""}
      {coverage.truncated ? " Attention : la lecture est limitée, tout n'est pas affiché." : ""}{" "}
      <span title={coverage.method} style={{ textDecoration: "underline dotted", cursor: "help" }}>Comment sont rattachés les éléments ?</span>
    </p>
  );
}
