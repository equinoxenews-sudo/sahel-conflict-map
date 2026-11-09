// Prototype du Lot 2 : géométrie de la grille, indépendante de la bibliothèque utilisée (GridStack ou React Grid Layout).
// Tout est pur et testé : c'est CE modèle qui est sauvegardé, les moteurs ne font que l'afficher et nous renvoyer des positions.

import { moduleDef, type ModuleKind } from "./modules";

export type Breakpoint = "desktop" | "tablet" | "mobile";

/** Colonnes par largeur de grille : 12 en bureau, 6 en tablette, 1 sur téléphone (cahier des charges F22). */
export const COLUMNS: Record<Breakpoint, number> = { desktop: 12, tablet: 6, mobile: 1 };
export const BREAKPOINTS: readonly Breakpoint[] = ["desktop", "tablet", "mobile"];

/** Largeurs de grille (en pixels) à partir desquelles on passe en bureau / tablette. */
export const DESKTOP_MIN_WIDTH = 900;
export const TABLET_MIN_WIDTH = 560;

export function breakpointForWidth(width: number): Breakpoint {
  if (width >= DESKTOP_MIN_WIDTH) return "desktop";
  if (width >= TABLET_MIN_WIDTH) return "tablet";
  return "mobile";
}

export interface Placement {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Taille minimale d'un module pour un nombre de colonnes (la largeur est ramenée proportionnellement ; une colonne : 1). */
export function minSizeFor(kind: ModuleKind, cols: number): { w: number; h: number } {
  const def = moduleDef(kind);
  return { w: cols === 1 ? 1 : Math.max(1, Math.min(cols, Math.ceil((def.minW * cols) / 12))), h: def.minH };
}

/** Taille par défaut d'un nouveau module pour un nombre de colonnes. */
export function defaultSizeFor(kind: ModuleKind, cols: number): { w: number; h: number } {
  const def = moduleDef(kind);
  return { w: cols === 1 ? 1 : Math.max(1, Math.min(cols, Math.round((def.defaultW * cols) / 12))), h: def.defaultH };
}

function overlaps(a: Pick<Placement, "x" | "y" | "w" | "h">, b: Pick<Placement, "x" | "y" | "w" | "h">): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Vrai si deux modules se chevauchent : ne doit jamais arriver dans une disposition enregistrée. */
export function hasOverlap(placements: readonly Placement[]): boolean {
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) if (overlaps(placements[i], placements[j])) return true;
  }
  return false;
}

/** Première place libre (de haut en bas, de gauche à droite) pour un module de w × h cellules. */
export function findFreeSpot(placements: readonly Placement[], w: number, h: number, cols: number): { x: number; y: number } {
  const width = Math.min(w, cols);
  for (let y = 0; ; y++) {
    for (let x = 0; x + width <= cols; x++) {
      if (!placements.some((p) => overlaps({ x, y, w: width, h }, p))) return { x, y };
    }
  }
}

/** Remonte chaque module le plus haut possible sans en chevaucher un autre (« gravité » vers le haut, comme les deux moteurs). */
export function compact(placements: readonly Placement[]): Placement[] {
  const sorted = placements.map((p) => ({ ...p })).sort((a, b) => a.y - b.y || a.x - b.x);
  const settled: Placement[] = [];
  for (const item of sorted) {
    let y = item.y;
    while (y > 0 && !settled.some((other) => overlaps({ ...item, y: y - 1 }, other))) y--;
    settled.push({ ...item, y });
  }
  // On rend l'ordre d'origine : l'ordre de la liste n'est pas significatif, mais il garde les comparaisons stables.
  return placements.map((p) => settled.find((s) => s.id === p.id) as Placement);
}

/**
 * Disposition pour une autre largeur, déduite de celle du bureau : ordre de lecture conservé, largeurs ramenées
 * proportionnellement, hauteurs gardées. Sert la première fois qu'on ouvre la tablette ou le téléphone.
 */
export function deriveLayout(source: readonly Placement[], kinds: Readonly<Record<string, ModuleKind>>, cols: number): Placement[] {
  const ordered = [...source].sort((a, b) => a.y - b.y || a.x - b.x);
  const out: Placement[] = [];
  for (const item of ordered) {
    const kind = kinds[item.id];
    const min = kind ? minSizeFor(kind, cols) : { w: 1, h: 1 };
    const w = cols === 1 ? 1 : Math.min(cols, Math.max(min.w, Math.round((item.w * cols) / 12)));
    const h = Math.max(min.h, item.h);
    const spot = findFreeSpot(out, w, h, cols);
    out.push({ id: item.id, x: spot.x, y: spot.y, w, h });
  }
  return compact(out);
}

/** Ramène des positions venues d'un moteur dans les limites de la grille (largeur, minimum) sans les déplacer inutilement. */
export function clampPlacements(placements: readonly Placement[], kinds: Readonly<Record<string, ModuleKind>>, cols: number): Placement[] {
  return placements.map((p) => {
    const min = kinds[p.id] ? minSizeFor(kinds[p.id], cols) : { w: 1, h: 1 };
    const w = Math.min(cols, Math.max(min.w, Math.round(p.w)));
    const h = Math.max(min.h, Math.round(p.h));
    const x = Math.min(Math.max(0, Math.round(p.x)), cols - w);
    return { id: p.id, x, y: Math.max(0, Math.round(p.y)), w, h };
  });
}

export function samePlacements(a: readonly Placement[], b: readonly Placement[]): boolean {
  if (a.length !== b.length) return false;
  const byId = new Map(b.map((p) => [p.id, p]));
  return a.every((p) => {
    const q = byId.get(p.id);
    return q !== undefined && q.x === p.x && q.y === p.y && q.w === p.w && q.h === p.h;
  });
}

// --- Rendu adaptatif ---------------------------------------------------------------------------------------------------

export type Band = "compact" | "standard" | "expanded";

/**
 * Niveau de détail d'un module d'après SES dimensions en pixels (et non d'après la taille de l'écran) : le même module est
 * compact dans une petite case, standard en taille normale, développé quand il est grand. Aucun appel IA : ce sont les mêmes
 * données structurées, présentées plus ou moins en détail.
 */
export function bandFor(widthPx: number, heightPx: number): Band {
  if (widthPx < 300 || heightPx < 230) return "compact";
  if (widthPx >= 620 && heightPx >= 400) return "expanded";
  return "standard";
}

export const BAND_LABELS: Record<Band, string> = { compact: "compact", standard: "standard", expanded: "développé" };

// --- Déplacement au clavier / au doigt ---------------------------------------------------------------------------------

/**
 * Décale ou redimensionne un module d'une ou plusieurs cellules (boutons du panneau de configuration : alternative au
 * glisser-déposer, utilisable au clavier et sur téléphone). Rend `null` si le résultat sortirait de la grille, passerait sous
 * le minimum du module ou en chevaucherait un autre : aucun module n'est jamais poussé en silence.
 */
export function nudge(
  placements: readonly Placement[],
  id: string,
  delta: { dx?: number; dy?: number; dw?: number; dh?: number },
  cols: number,
  min: { w: number; h: number },
): Placement[] | null {
  const current = placements.find((p) => p.id === id);
  if (!current) return null;
  const next = { ...current, x: current.x + (delta.dx ?? 0), y: current.y + (delta.dy ?? 0), w: current.w + (delta.dw ?? 0), h: current.h + (delta.dh ?? 0) };
  if (next.x < 0 || next.y < 0 || next.w < min.w || next.h < min.h || next.x + next.w > cols) return null;
  if (placements.some((p) => p.id !== id && overlaps(next, p))) return null;
  return compact(placements.map((p) => (p.id === id ? next : p)));
}

/**
 * Insère un module à la case voulue (dépose à la souris) : les modules qui gênent sont poussés vers le bas, dans l'ordre de
 * lecture, puis le tout est compacté. C'est le comportement natif des deux moteurs, reproduit dans notre modèle pour que
 * l'ajout se comporte pareil quel que soit le moteur.
 */
export function insertAt(existing: readonly Placement[], item: Placement): Placement[] {
  const fixed: Placement[] = [item];
  const others = existing.map((p) => ({ ...p })).sort((a, b) => a.y - b.y || a.x - b.x);
  for (const other of others) {
    let blocker = fixed.find((f) => overlaps(f, other));
    while (blocker) {
      other.y = blocker.y + blocker.h;
      blocker = fixed.find((f) => overlaps(f, other));
    }
    fixed.push(other);
  }
  return compact(fixed);
}
