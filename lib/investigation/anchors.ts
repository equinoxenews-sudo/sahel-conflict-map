import type { AnchorId, LineStyle } from "./types";

// Points d'ancrage d'une fiche du graphe, comme les poignées d'une forme PowerPoint :
// les quatre coins et le milieu de chaque côté. Une relation part d'un point et arrive à un autre ;
// sans choix (« auto »), le trait relie les deux côtés qui se font face.

export const ANCHOR_IDS: AnchorId[] = ["tl", "tc", "tr", "ml", "mr", "bl", "bc", "br"];

export const ANCHOR_LABELS: Record<AnchorId, string> = {
  tl: "Haut gauche",
  tc: "Haut",
  tr: "Haut droite",
  ml: "Gauche",
  mr: "Droite",
  bl: "Bas gauche",
  bc: "Bas",
  br: "Bas droite",
};

/** Position de chaque point dans le schéma de choix (en pourcentage du rectangle). */
export const ANCHOR_DIAGRAM: Record<AnchorId, { x: number; y: number }> = {
  tl: { x: 0, y: 0 },
  tc: { x: 50, y: 0 },
  tr: { x: 100, y: 0 },
  ml: { x: 0, y: 50 },
  mr: { x: 100, y: 50 },
  bl: { x: 0, y: 100 },
  bc: { x: 50, y: 100 },
  br: { x: 100, y: 100 },
};

export const LINE_STYLES: LineStyle[] = ["straight", "curve", "elbow"];

export const LINE_STYLE_LABELS: Record<LineStyle, string> = {
  straight: "Droit",
  curve: "Courbe",
  elbow: "Coude",
};

export function isAnchorId(value: unknown): value is AnchorId {
  return typeof value === "string" && (ANCHOR_IDS as string[]).includes(value);
}

export function isLineStyle(value: unknown): value is LineStyle {
  return typeof value === "string" && (LINE_STYLES as string[]).includes(value);
}

/** Côté d'où sort (ou où arrive) le trait : sert à orienter les courbes et les coudes. */
export type AnchorSide = "top" | "bottom" | "left" | "right";

export function sideOf(anchor: AnchorId): AnchorSide {
  switch (anchor) {
    case "tl":
    case "tc":
    case "tr":
      return "top";
    case "bl":
    case "bc":
    case "br":
      return "bottom";
    case "ml":
      return "left";
    case "mr":
      return "right";
  }
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Points d'ancrage choisis automatiquement quand la relation n'en précise pas : les côtés qui se
 * font face. Plus les deux fiches sont écartées horizontalement (par rapport à leur largeur), plus on
 * relie droite et gauche ; sinon bas et haut.
 */
export function autoAnchors(source: Rect, target: Rect): { source: AnchorId; target: AnchorId } {
  const dx = target.x + target.width / 2 - (source.x + source.width / 2);
  const dy = target.y + target.height / 2 - (source.y + source.height / 2);
  const horizontal = Math.abs(dx) / ((source.width + target.width) / 2 || 1);
  const vertical = Math.abs(dy) / ((source.height + target.height) / 2 || 1);
  if (horizontal > vertical) {
    return dx >= 0 ? { source: "mr", target: "ml" } : { source: "ml", target: "mr" };
  }
  return dy >= 0 ? { source: "bc", target: "tc" } : { source: "tc", target: "bc" };
}
