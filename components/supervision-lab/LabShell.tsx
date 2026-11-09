"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fakeEvents } from "@/lib/supervision/lab/fixtures";
import { COLUMNS, breakpointForWidth, minSizeFor, nudge, type Breakpoint, type Placement } from "@/lib/supervision/lab/layout";
import { MODULES, moduleDef, type ModuleKind } from "@/lib/supervision/lab/modules";
import {
  DEMO_STATES,
  PERIODS,
  THEMES,
  addWidget,
  duplicateWidget,
  effectiveFilters,
  emptyState,
  exampleState,
  kindsOf,
  layoutFor,
  parseState,
  removeWidget,
  resetWidget,
  serializeState,
  setGlobals,
  setLayout,
  updateWidget,
  type Filters,
  type LabState,
  type Theme,
} from "@/lib/supervision/lab/state";
import { LabContext, type LabActions } from "./LabContext";
import LabFrame from "./LabFrame";
import type { GridEngineProps } from "./engines/types";
import styles from "./Lab.module.css";

export type EngineName = "gridstack" | "rgl";

const GridStackEngine = dynamic<GridEngineProps>(() => import("./engines/GridStackEngine"), { ssr: false });
const RglEngine = dynamic<GridEngineProps>(() => import("./engines/RglEngine"), { ssr: false });

const STORAGE_PREFIX = "equinoxe-supervision-lab-v1-";
const SAVE_DELAY_MS = 600;

type Simulated = "auto" | Breakpoint;
const SIM_WIDTH: Record<Simulated, string | undefined> = { auto: undefined, desktop: undefined, tablet: "720px", mobile: "380px" };

function loadState(engine: EngineName): LabState {
  try {
    return parseState(window.localStorage.getItem(STORAGE_PREFIX + engine)) ?? emptyState();
  } catch {
    return emptyState();
  }
}

function timeLabel(at: number): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(at));
}

export default function LabShell({ engine }: { engine: EngineName }) {
  const [state, setState] = useState<LabState>(() => loadState(engine));
  const [now] = useState(() => Date.now());
  const events = useMemo(() => fakeEvents(now), [now]);
  const [editMode, setEditMode] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fullscreenId, setFullscreenId] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [simulated, setSimulated] = useState<Simulated>("auto");
  const [saveStatus, setSaveStatus] = useState<{ kind: "saved" | "pending"; at: number }>({ kind: "saved", at: 0 });
  const [copied, setCopied] = useState(false);
  const libraryDragRef = useRef<ModuleKind | null>(null);

  // Largeur de la grille, mesurée : elle fixe le nombre de colonnes (12, 6 ou 1) et donc quelle disposition on édite.
  const canvasRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const breakpoint: Breakpoint = breakpointForWidth(width || 1200);
  const cols = COLUMNS[breakpoint];
  const kinds = useMemo(() => kindsOf(state), [state]);
  const placements = useMemo(() => layoutFor(state, breakpoint), [state, breakpoint]);
  const editable = editMode;

  // Sauvegarde automatique, à retardement (les déplacements successifs ne font qu'une écriture).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_PREFIX + engine, serializeState(state));
      } catch {
        /* stockage indisponible : la démonstration continue sans sauvegarde */
      }
      setSaveStatus({ kind: "saved", at: Date.now() });
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [state, engine]);

  const change = useCallback((update: (current: LabState) => LabState) => {
    setSaveStatus((s) => ({ ...s, kind: "pending" }));
    setState(update);
  }, []);

  const onPlacementsChange = useCallback((next: Placement[]) => change((current) => setLayout(current, breakpoint, next)), [change, breakpoint]);
  // Ajout et copie : le nouvel identifiant est connu avant de changer l'état (jamais d'effet de bord dans une fonction de mise à jour).
  const onLibraryDrop = useCallback(
    (kind: ModuleKind, x: number, y: number) => {
      const added = addWidget(state, kind, { at: { breakpoint, x, y } });
      change(() => added.state);
      setSelectedId(added.id);
    },
    [change, breakpoint, state],
  );

  const actions: LabActions = useMemo(
    () => ({
      update: (id, patch) => change((current) => updateWidget(current, id, patch)),
      remove: (id) => {
        change((current) => removeWidget(current, id));
        setSelectedId((current) => (current === id ? null : current));
        setFullscreenId((current) => (current === id ? null : current));
      },
      duplicate: (id) => {
        const copy = duplicateWidget(state, id);
        if (!copy) return;
        change(() => copy.state);
        setSelectedId(copy.id);
      },
      reset: (id) => change((current) => resetWidget(current, id)),
      select: setSelectedId,
      fullscreen: setFullscreenId,
    }),
    [change, state],
  );

  const addFromLibrary = (kind: ModuleKind) => {
    const added = addWidget(state, kind);
    change(() => added.state);
    setSelectedId(added.id);
  };

  const selected = selectedId ? state.widgets[selectedId] : undefined;
  const move = (delta: { dx?: number; dy?: number; dw?: number; dh?: number }) => {
    if (!selected) return;
    const next = nudge(placements, selected.id, delta, cols, minSizeFor(selected.kind, cols));
    if (next) onPlacementsChange(next);
  };

  const restoreLastSaved = () => change(() => loadState(engine));
  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  // Échap ferme le plein écran, puis le volet de configuration.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (fullscreenId) setFullscreenId(null);
      else setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreenId]);

  const Engine = engine === "gridstack" ? GridStackEngine : RglEngine;
  const empty = Object.keys(state.widgets).length === 0;

  return (
    <LabContext.Provider value={{ state, events, now, editable, selectedId, actions }}>
      <div className={styles.shell}>
        <div className={styles.toolbar}>
          <div className={styles.toolGroup}>
            <strong className={styles.engineTag}>{engine === "gridstack" ? "GridStack 14" : "React Grid Layout 2"}</strong>
            <div className={styles.segment} role="group" aria-label="Mode">
              <button type="button" aria-pressed={editMode} className={editMode ? styles.active : undefined} onClick={() => setEditMode(true)}>Édition</button>
              <button type="button" aria-pressed={!editMode} className={!editMode ? styles.active : undefined} onClick={() => { setEditMode(false); setSelectedId(null); }}>Consultation</button>
            </div>
            <div className={styles.segment} role="group" aria-label="Simuler la largeur">
              {(["auto", "desktop", "tablet", "mobile"] as Simulated[]).map((s) => (
                <button key={s} type="button" aria-pressed={simulated === s} className={simulated === s ? styles.active : undefined} onClick={() => setSimulated(s)}>
                  {s === "auto" ? "Auto" : s === "desktop" ? "Bureau" : s === "tablet" ? "Tablette" : "Téléphone"}
                </button>
              ))}
            </div>
            <span className={styles.muted}>{width} px · {cols} colonne{cols > 1 ? "s" : ""} · disposition « {breakpoint === "desktop" ? "bureau" : breakpoint === "tablet" ? "tablette" : "téléphone"} »</span>
          </div>
          <div className={styles.toolGroup}>
            <GlobalFilters filters={state.globals} onChange={(patch) => change((current) => setGlobals(current, patch))} />
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.toolGroup}>
            <span className={styles.muted} role="status">
              {saveStatus.kind === "pending" ? "Modifications en cours d'enregistrement…" : saveStatus.at ? `Enregistré à ${timeLabel(saveStatus.at)}` : "Enregistrement automatique (ce navigateur)"}
            </span>
            <button type="button" className={styles.btn} onClick={restoreLastSaved}>Restaurer le dernier enregistrement</button>
            <button type="button" className={styles.btn} onClick={() => { change(() => exampleState()); setSelectedId(null); }}>Charger l&apos;exemple</button>
            <button type="button" className={styles.btn} onClick={() => { change(() => emptyState()); setSelectedId(null); }}>Tableau vierge</button>
            <button type="button" className={styles.btn} onClick={copyJson}>{copied ? "Copié" : "Copier la disposition (JSON)"}</button>
          </div>
        </div>

        {editable ? (
          <section className={styles.library} aria-label="Bibliothèque de modules">
            <button type="button" className={styles.libraryToggle} aria-expanded={libraryOpen} onClick={() => setLibraryOpen((open) => !open)}>
              Modules {libraryOpen ? "▴" : "▾"}
            </button>
            {libraryOpen ? (
              <div className={styles.chips}>
                {MODULES.map((m) => (
                  <button
                    key={m.kind}
                    type="button"
                    data-lab-chip
                    data-kind={m.kind}
                    className={styles.chip2}
                    title={`${m.description} — cliquer pour ajouter, ou glisser sur la grille`}
                    // React Grid Layout reçoit la dépose par le glisser-déposer HTML5 du navigateur ; GridStack a son propre mécanisme
                    // à la souris (setupDragIn) et émet lui-même un « dragstart » sans données : on n'y branche rien.
                    {...(engine === "rgl"
                      ? {
                          draggable: true,
                          onDragStart: (event: React.DragEvent) => {
                            libraryDragRef.current = m.kind;
                            event.dataTransfer?.setData("text/plain", m.kind);
                            if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
                          },
                          onDragEnd: () => {
                            libraryDragRef.current = null;
                          },
                        }
                      : {})}
                    onClick={() => addFromLibrary(m.kind)}
                  >
                    <b>{m.label}</b>
                    <span>{m.description}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <div className={styles.work} data-panel={editable && selected ? "" : undefined}>
          <div className={styles.canvasOuter}>
            <div ref={canvasRef} className={styles.canvas} style={{ maxWidth: SIM_WIDTH[simulated] }} data-bp={breakpoint}>
              {empty ? (
                <div className={styles.emptyBoard}>
                  <h2>Tableau vierge</h2>
                  <p>Une nouvelle Supervision commence sans module. Ajoutez-en depuis le bandeau ci-dessus (clic ou glisser-déposer), ou chargez l&apos;exemple.</p>
                </div>
              ) : null}
              {/* La grille n'est montée qu'une fois la largeur mesurée : sinon un téléphone afficherait d'abord 12 colonnes. */}
              {width > 0 ? (
              <Engine
                breakpoint={breakpoint}
                cols={cols}
                width={width}
                placements={placements}
                kinds={kinds}
                editable={editable}
                onPlacementsChange={onPlacementsChange}
                onLibraryDrop={onLibraryDrop}
                libraryDragRef={libraryDragRef}
                renderWidget={(id) => <LabFrame id={id} />}
              />
              ) : null}
            </div>
          </div>

          {editable && selected ? (
            <aside className={styles.panel} aria-label="Configuration du module">
              <div className={styles.panelHead}>
                <h2>{moduleDef(selected.kind).label}</h2>
                <button type="button" className={styles.iconBtn} aria-label="Fermer" onClick={() => setSelectedId(null)}>✕</button>
              </div>
              <label className={styles.field}>
                <span>Titre</span>
                <input value={selected.title} maxLength={80} onChange={(event) => actions.update(selected.id, { title: event.target.value })} />
              </label>
              <label className={styles.check}>
                <input type="checkbox" checked={selected.follow} onChange={(event) => actions.update(selected.id, { follow: event.target.checked })} />
                <span>Suivre les filtres globaux</span>
              </label>
              <fieldset className={styles.fieldset}>
                <legend>Filtres propres au module</legend>
                <label className={styles.field}>
                  <span>Période</span>
                  <select
                    value={selected.local.periodDays ?? ""}
                    onChange={(event) => {
                      const { periodDays: _removed, ...rest } = selected.local;
                      void _removed;
                      actions.update(selected.id, { local: event.target.value ? { ...rest, periodDays: Number(event.target.value) } : rest });
                    }}
                  >
                    <option value="">{selected.follow ? "Globale" : "30 jours (défaut)"}</option>
                    {PERIODS.map((p) => (<option key={p} value={p}>{p} jours</option>))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Thème</span>
                  <select
                    value={selected.local.theme ?? ""}
                    onChange={(event) => {
                      const { theme: _removed, ...rest } = selected.local;
                      void _removed;
                      actions.update(selected.id, { local: event.target.value ? { ...rest, theme: event.target.value as Theme } : rest });
                    }}
                  >
                    <option value="">{selected.follow ? "Global" : "Tous (défaut)"}</option>
                    {THEMES.filter((t) => t.key !== "all").map((t) => (<option key={t.key} value={t.key}>{t.label}</option>))}
                  </select>
                </label>
                {selected.follow && effectiveFilters(selected, state.globals).overridesGlobal ? (
                  <p className={styles.note}>Le filtre local explicite prévaut sur le filtre global.</p>
                ) : null}
              </fieldset>
              <label className={styles.field}>
                <span>État simulé</span>
                <select value={selected.demoState} onChange={(event) => actions.update(selected.id, { demoState: event.target.value as (typeof DEMO_STATES)[number]["key"] })}>
                  {DEMO_STATES.map((s) => (<option key={s.key} value={s.key}>{s.label}</option>))}
                </select>
              </label>
              <fieldset className={styles.fieldset}>
                <legend>Position et taille (clavier, tactile)</legend>
                <div className={styles.pad} role="group" aria-label="Déplacer">
                  <button type="button" className={styles.btn} onClick={() => move({ dy: -1 })} aria-label="Monter">↑</button>
                  <button type="button" className={styles.btn} onClick={() => move({ dx: -1 })} aria-label="Gauche">←</button>
                  <button type="button" className={styles.btn} onClick={() => move({ dx: 1 })} aria-label="Droite">→</button>
                  <button type="button" className={styles.btn} onClick={() => move({ dy: 1 })} aria-label="Descendre">↓</button>
                </div>
                <div className={styles.pad} role="group" aria-label="Redimensionner">
                  <button type="button" className={styles.btn} onClick={() => move({ dw: -1 })}>Largeur −</button>
                  <button type="button" className={styles.btn} onClick={() => move({ dw: 1 })}>Largeur +</button>
                  <button type="button" className={styles.btn} onClick={() => move({ dh: -1 })}>Hauteur −</button>
                  <button type="button" className={styles.btn} onClick={() => move({ dh: 1 })}>Hauteur +</button>
                </div>
              </fieldset>
              <div className={styles.panelActions}>
                <button type="button" className={styles.btn} onClick={() => actions.reset(selected.id)}>Réinitialiser</button>
                <button type="button" className={styles.btn} onClick={() => actions.duplicate(selected.id)}>Dupliquer</button>
                <button type="button" className={`${styles.btn} ${styles.dangerBtn}`} onClick={() => actions.remove(selected.id)}>Supprimer</button>
              </div>
            </aside>
          ) : null}
        </div>

        {fullscreenId && state.widgets[fullscreenId] ? (
          <div className={styles.fullscreen} role="dialog" aria-modal="true" aria-label="Module en plein écran">
            <LabFrame id={fullscreenId} fullscreen />
          </div>
        ) : null}
      </div>
    </LabContext.Provider>
  );
}

function GlobalFilters({ filters, onChange }: { filters: Filters; onChange: (patch: Partial<Filters>) => void }) {
  return (
    <div className={styles.globals} role="group" aria-label="Filtres globaux">
      <span className={styles.muted}>Filtres globaux</span>
      <select aria-label="Période globale" value={filters.periodDays} onChange={(event) => onChange({ periodDays: Number(event.target.value) })}>
        {PERIODS.map((p) => (<option key={p} value={p}>{p} jours</option>))}
      </select>
      <select aria-label="Thème global" value={filters.theme} onChange={(event) => onChange({ theme: event.target.value as Theme })}>
        {THEMES.map((t) => (<option key={t.key} value={t.key}>{t.label}</option>))}
      </select>
      <button type="button" className={styles.btn} onClick={() => onChange({ periodDays: 30, theme: "all" })}>Réinitialiser</button>
    </div>
  );
}
