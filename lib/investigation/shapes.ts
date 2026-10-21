import type { GraphShape, ShapeKind } from "./types";

// Boîte à outils du graphe : formes, annotations, couleurs et ordre des couches.

export const SHAPE_KINDS: ShapeKind[] = ["rect", "roundRect", "ellipse", "triangle", "diamond", "line", "arrow", "text"];

export const SHAPE_LABELS: Record<ShapeKind, string> = {
  rect: "Rectangle",
  roundRect: "Rectangle arrondi",
  ellipse: "Ellipse",
  triangle: "Triangle",
  diamond: "Losange",
  line: "Ligne",
  arrow: "Flèche",
  text: "Texte libre",
};

/** Les lignes et flèches n'ont pas de remplissage ; le texte libre n'a ni remplissage ni contour par défaut. */
export function hasFill(kind: ShapeKind): boolean {
  return kind !== "line" && kind !== "arrow";
}

export const PALETTE: { color: string; label: string }[] = [
  { color: "#c89b3c", label: "Or" },
  { color: "#e0b44c", label: "Or clair" },
  { color: "#ffffff", label: "Blanc" },
  { color: "#8f9baa", label: "Gris" },
  { color: "#1c2740", label: "Bleu nuit" },
  { color: "#d94a4a", label: "Rouge" },
  { color: "#e87932", label: "Orange" },
  { color: "#3ea76b", label: "Vert" },
  { color: "#42a5f5", label: "Bleu" },
  { color: "#9b6dff", label: "Violet" },
  { color: "#000000", label: "Noir" },
];

export const FONT_SIZES = [12, 14, 16, 20, 28, 40];
export const STROKE_WIDTHS = [1, 2, 3, 4, 6, 8];

const DEFAULT_SIZE: Record<ShapeKind, { width: number; height: number }> = {
  rect: { width: 180, height: 110 },
  roundRect: { width: 180, height: 110 },
  ellipse: { width: 180, height: 110 },
  triangle: { width: 140, height: 120 },
  diamond: { width: 150, height: 120 },
  line: { width: 160, height: 16 },
  arrow: { width: 160, height: 16 },
  text: { width: 220, height: 56 },
};

/** Forme neuve, avec le style par défaut de son type, centrée sur `center` (position dans le graphe). */
export function newShape(
  kind: ShapeKind,
  dossierId: string,
  center: { x: number; y: number },
  z: number
): Omit<GraphShape, "id" | "createdAt"> {
  const size = DEFAULT_SIZE[kind];
  const base = {
    dossierId,
    kind,
    position: { x: Math.round(center.x - size.width / 2), y: Math.round(center.y - size.height / 2) },
    width: size.width,
    height: size.height,
    z,
  };
  if (kind === "text") {
    return { ...base, text: "", textColor: "#ffffff", fontSize: 16 };
  }
  if (kind === "line" || kind === "arrow") {
    return { ...base, stroke: "#e0b44c", strokeWidth: 2 };
  }
  return { ...base, fill: "#c89b3c", fillOpacity: 0.18, stroke: "#c89b3c", strokeWidth: 2, textColor: "#ffffff", fontSize: 14 };
}

export type LayerOperation = "front" | "forward" | "backward" | "back";

/** Marqueur des fiches du graphe dans l'ordre des couches (elles sont toutes à la même hauteur). */
const CARDS = "__cards__";

/**
 * Nouvel ordre des couches après « premier plan », « avancer », « reculer » ou « dernier plan ».
 * Les fiches du graphe forment une couche à part (z = 0) : une forme peut passer devant ou derrière.
 * Renvoie le z de chaque forme dont la valeur change.
 */
export function reorderShape(shapes: GraphShape[], id: string, operation: LayerOperation): Record<string, number> {
  const items = [
    ...shapes.map((shape) => ({ id: shape.id, z: shape.z, order: shape.createdAt })),
    { id: CARDS, z: 0, order: "" },
  ].sort((a, b) => a.z - b.z || a.order.localeCompare(b.order) || a.id.localeCompare(b.id));
  const ids = items.map((item) => item.id);
  const from = ids.indexOf(id);
  if (from === -1) return {};

  const [moved] = ids.splice(from, 1);
  let to = from;
  if (operation === "front") to = ids.length;
  else if (operation === "back") to = 0;
  else if (operation === "forward") to = Math.min(ids.length, from + 1);
  else to = Math.max(0, from - 1);
  ids.splice(to, 0, moved);

  // Les formes derrière les fiches reçoivent -k…-1, celles devant 1…m.
  const cardIndex = ids.indexOf(CARDS);
  const next: Record<string, number> = {};
  ids.forEach((itemId, index) => {
    if (itemId === CARDS) return;
    next[itemId] = index - cardIndex;
  });

  const changed: Record<string, number> = {};
  for (const shape of shapes) {
    if (next[shape.id] !== undefined && next[shape.id] !== shape.z) changed[shape.id] = next[shape.id];
  }
  return changed;
}

/** Couche d'une nouvelle forme : devant tout le reste. */
export function frontZ(shapes: GraphShape[]): number {
  return shapes.reduce((max, shape) => Math.max(max, shape.z), 0) + 1;
}

/** Largeur par défaut, minimale et maximale de la carte d'une image posée dans le graphe (pixels du graphe). */
export const IMAGE_CARD_WIDTH = 280;
export const IMAGE_CARD_MIN = 120;
export const IMAGE_CARD_MAX = 1200;

/** Largeur retenue pour une carte image : bornée, arrondie ; une valeur absente ou illisible donne la largeur par défaut. */
export function clampImageWidth(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return IMAGE_CARD_WIDTH;
  return Math.round(Math.min(IMAGE_CARD_MAX, Math.max(IMAGE_CARD_MIN, value)));
}
