// Prototype du Lot 2 : état d'un tableau de bord (modules, dispositions, filtres) et sa sérialisation. Module pur, testé.
// Les dispositions de bureau, tablette et téléphone sont distinctes (cahier des charges, section 3.2) : modifier l'une ne
// déplace jamais les autres. Ajouter, dupliquer ou supprimer un module s'applique aux trois.

import { BREAKPOINTS, COLUMNS, clampPlacements, compact, defaultSizeFor, deriveLayout, findFreeSpot, hasOverlap, insertAt, type Breakpoint, type Placement } from "./layout";
import { isModuleKind, moduleDef, type ModuleKind } from "./modules";

export type Theme = "all" | "conflits" | "securite" | "politique" | "humanitaire";
export const THEMES: readonly { key: Theme; label: string }[] = [
  { key: "all", label: "Tous les thèmes" },
  { key: "conflits", label: "Conflits" },
  { key: "securite", label: "Sécurité" },
  { key: "politique", label: "Politique" },
  { key: "humanitaire", label: "Humanitaire" },
];
export const PERIODS: readonly number[] = [7, 30, 90];

export interface Filters {
  periodDays: number;
  theme: Theme;
}
export const DEFAULT_FILTERS: Filters = { periodDays: 30, theme: "all" };

/** États d'un module (cahier des charges 3.2) : le prototype permet de les forcer pour les voir. */
export type DemoState = "normal" | "empty" | "loading" | "error" | "stale";
export const DEMO_STATES: readonly { key: DemoState; label: string }[] = [
  { key: "normal", label: "Normal" },
  { key: "empty", label: "Vide" },
  { key: "loading", label: "Chargement" },
  { key: "error", label: "Erreur" },
  { key: "stale", label: "Obsolète" },
];

export interface WidgetConfig {
  id: string;
  kind: ModuleKind;
  title: string;
  /** « Suivre les filtres globaux » (cahier des charges 3.3). Désactivé : le module garde ses filtres propres. */
  follow: boolean;
  /** Filtres propres au module. Un filtre local explicite prévaut sur le filtre global. */
  local: Partial<Filters>;
  demoState: DemoState;
}

export interface LabState {
  version: 1;
  nextId: number;
  widgets: Record<string, WidgetConfig>;
  layouts: { desktop: Placement[]; tablet: Placement[] | null; mobile: Placement[] | null };
  globals: Filters;
}

export function emptyState(): LabState {
  return { version: 1, nextId: 1, widgets: {}, layouts: { desktop: [], tablet: null, mobile: null }, globals: { ...DEFAULT_FILTERS } };
}

export function kindsOf(state: LabState): Record<string, ModuleKind> {
  return Object.fromEntries(Object.values(state.widgets).map((w) => [w.id, w.kind]));
}

/** Disposition d'une largeur : celle enregistrée, sinon déduite de celle du bureau (sans la mémoriser tant qu'on n'y touche pas). */
export function layoutFor(state: LabState, breakpoint: Breakpoint): Placement[] {
  const saved = state.layouts[breakpoint];
  if (saved) return saved;
  return deriveLayout(state.layouts.desktop, kindsOf(state), COLUMNS[breakpoint]);
}

// --- Actions ----------------------------------------------------------------------------------------------------------

/** Ajoute un module. `at` (pour une dépose à la souris) vaut pour la largeur courante ; ailleurs, première place libre. */
export function addWidget(state: LabState, kind: ModuleKind, options: { at?: { breakpoint: Breakpoint; x: number; y: number }; title?: string } = {}): { state: LabState; id: string } {
  const id = `m${state.nextId}`;
  const widget: WidgetConfig = { id, kind, title: options.title ?? moduleDef(kind).label, follow: false, local: {}, demoState: "normal" };
  const kinds = { ...kindsOf(state), [id]: kind };
  const layouts: LabState["layouts"] = { desktop: [], tablet: null, mobile: null };
  for (const breakpoint of BREAKPOINTS) {
    const cols = COLUMNS[breakpoint];
    const existing = layoutFor(state, breakpoint);
    const size = defaultSizeFor(kind, cols);
    // Dépose à la souris : le module prend la case visée et pousse les voisins vers le bas ; sinon, première place libre.
    const placements =
      options.at && options.at.breakpoint === breakpoint
        ? insertAt(existing, { id, x: Math.min(Math.max(0, options.at.x), cols - size.w), y: Math.max(0, options.at.y), ...size })
        : [...existing, { id, ...findFreeSpot(existing, size.w, size.h, cols), ...size }];
    const settled = compact(clampPlacements(placements, kinds, cols));
    if (breakpoint === "desktop") layouts.desktop = settled;
    else layouts[breakpoint] = settled;
  }
  return { state: { ...state, nextId: state.nextId + 1, widgets: { ...state.widgets, [id]: widget }, layouts }, id };
}

export function removeWidget(state: LabState, id: string): LabState {
  const { [id]: removed, ...widgets } = state.widgets;
  void removed;
  const without = (list: Placement[] | null) => (list ? compact(list.filter((p) => p.id !== id)) : null);
  return { ...state, widgets, layouts: { desktop: compact(state.layouts.desktop.filter((p) => p.id !== id)), tablet: without(state.layouts.tablet), mobile: without(state.layouts.mobile) } };
}

/** Copie d'un module (mêmes réglages, nouveau numéro, placé à la première place libre) : « plusieurs exemplaires d'un même module ». */
export function duplicateWidget(state: LabState, id: string): { state: LabState; id: string } | null {
  const source = state.widgets[id];
  if (!source) return null;
  const added = addWidget(state, source.kind, { title: `${source.title} (copie)` });
  const copy = added.state.widgets[added.id];
  const widgets = { ...added.state.widgets, [added.id]: { ...copy, follow: source.follow, local: { ...source.local }, demoState: source.demoState } };
  return { state: { ...added.state, widgets }, id: added.id };
}

export function updateWidget(state: LabState, id: string, patch: Partial<Omit<WidgetConfig, "id" | "kind">>): LabState {
  const current = state.widgets[id];
  if (!current) return state;
  return { ...state, widgets: { ...state.widgets, [id]: { ...current, ...patch } } };
}

/** Réinitialise les filtres propres d'un module (« paramètres personnalisables et réinitialisables », F06). */
export function resetWidget(state: LabState, id: string): LabState {
  const current = state.widgets[id];
  if (!current) return state;
  return updateWidget(state, id, { title: moduleDef(current.kind).label, follow: false, local: {}, demoState: "normal" });
}

/** Enregistre la disposition d'une largeur telle que le moteur la renvoie (ramenée dans les limites). */
export function setLayout(state: LabState, breakpoint: Breakpoint, placements: readonly Placement[]): LabState {
  const known = placements.filter((p) => state.widgets[p.id]);
  // Toujours compacté : les deux moteurs font « tomber » les modules vers le haut ; un état avec des trous serait recompacté par le
  // moteur, qui le renverrait, et la grille bouclerait (constaté avec GridStack).
  const settled = compact(clampPlacements(known, kindsOf(state), COLUMNS[breakpoint]));
  return { ...state, layouts: { ...state.layouts, [breakpoint]: settled } };
}

export function setGlobals(state: LabState, patch: Partial<Filters>): LabState {
  return { ...state, globals: { ...state.globals, ...patch } };
}

/** Filtres réellement appliqués à un module : globaux s'il les suit, sinon valeurs par défaut ; le filtre local explicite prévaut. */
export function effectiveFilters(widget: WidgetConfig, globals: Filters): { filters: Filters; overridesGlobal: boolean } {
  const base = widget.follow ? globals : DEFAULT_FILTERS;
  const filters: Filters = { ...base, ...widget.local } as Filters;
  const overridesGlobal = widget.follow && ((widget.local.periodDays !== undefined && widget.local.periodDays !== globals.periodDays) || (widget.local.theme !== undefined && widget.local.theme !== globals.theme));
  return { filters, overridesGlobal };
}

// --- Disposition d'exemple ---------------------------------------------------------------------------------------------

/** Un tableau d'exemple pour la démonstration (le tableau d'une nouvelle Supervision, lui, est vierge : cahier des charges F02). */
export function exampleState(): LabState {
  let state = emptyState();
  const spots: { kind: ModuleKind; x: number; y: number }[] = [
    { kind: "summary", x: 0, y: 0 },
    { kind: "map", x: 6, y: 0 },
    { kind: "alerts", x: 0, y: 5 },
    { kind: "stats", x: 4, y: 5 },
    { kind: "feed", x: 8, y: 6 },
    { kind: "timeline", x: 0, y: 9 },
  ];
  for (const spot of spots) state = addWidget(state, spot.kind, { at: { breakpoint: "desktop", x: spot.x, y: spot.y } }).state;
  return state;
}

// --- Enregistrement ---------------------------------------------------------------------------------------------------

export function serializeState(state: LabState): string {
  return JSON.stringify(state);
}

function isInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function parsePlacements(raw: unknown, cols: number, widgets: Record<string, WidgetConfig>): Placement[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Placement[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const p = item as Partial<Placement> | null;
    if (!p || typeof p.id !== "string" || !widgets[p.id] || seen.has(p.id)) return null;
    if (!isInt(p.x) || !isInt(p.y) || !isInt(p.w) || !isInt(p.h)) return null;
    if (p.x < 0 || p.y < 0 || p.w < 1 || p.h < 1 || p.x + p.w > cols) return null;
    seen.add(p.id);
    out.push({ id: p.id, x: p.x, y: p.y, w: p.w, h: p.h });
  }
  return hasOverlap(out) ? null : out;
}

/** Relit un état enregistré ; `null` si le texte est invalide ou incohérent (l'appelant repart alors du tableau vierge). */
export function parseState(text: string | null): LabState | null {
  if (!text) return null;
  try {
    const raw = JSON.parse(text) as Partial<LabState> | null;
    if (!raw || raw.version !== 1 || !isInt(raw.nextId) || !raw.widgets || typeof raw.widgets !== "object" || !raw.layouts) return null;
    const widgets: Record<string, WidgetConfig> = {};
    for (const [id, value] of Object.entries(raw.widgets)) {
      const w = value as Partial<WidgetConfig> | null;
      if (!w || w.id !== id || !isModuleKind(w.kind) || typeof w.title !== "string" || typeof w.follow !== "boolean") return null;
      const demoState = DEMO_STATES.some((s) => s.key === w.demoState) ? (w.demoState as DemoState) : "normal";
      widgets[id] = { id, kind: w.kind, title: w.title.slice(0, 80), follow: w.follow, local: w.local && typeof w.local === "object" ? { ...w.local } : {}, demoState };
    }
    const desktop = parsePlacements(raw.layouts.desktop, COLUMNS.desktop, widgets);
    if (!desktop) return null;
    // Chaque module doit avoir sa place dans la disposition du bureau, et chaque disposition enregistrée dans les autres.
    if (Object.keys(widgets).some((id) => !desktop.some((p) => p.id === id))) return null;
    const tablet = raw.layouts.tablet === null ? null : parsePlacements(raw.layouts.tablet, COLUMNS.tablet, widgets);
    const mobile = raw.layouts.mobile === null ? null : parsePlacements(raw.layouts.mobile, COLUMNS.mobile, widgets);
    if (raw.layouts.tablet !== null && !tablet) return null;
    if (raw.layouts.mobile !== null && !mobile) return null;
    const g = raw.globals as Partial<Filters> | undefined;
    const globals: Filters = {
      periodDays: g && PERIODS.includes(g.periodDays as number) ? (g.periodDays as number) : DEFAULT_FILTERS.periodDays,
      theme: g && THEMES.some((t) => t.key === g.theme) ? (g.theme as Theme) : DEFAULT_FILTERS.theme,
    };
    // Une disposition enregistrée avec des trous (ancienne version, édition à la main) est remontée plutôt que refusée.
    return { version: 1, nextId: raw.nextId, widgets, layouts: { desktop: compact(desktop), tablet: tablet ? compact(tablet) : null, mobile: mobile ? compact(mobile) : null }, globals };
  } catch {
    return null;
  }
}
