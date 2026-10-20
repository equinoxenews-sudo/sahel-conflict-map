// Mise en forme du passage sélectionné dans le texte d'une fiche : gras, italique, surlignage, couleur.
// Le texte reste du texte simple (rien d'invisible) : **gras**, *italique*, ==surligné==, {{#rrggbb|coloré}}.
// Fonctions pures : le champ de saisie fournit le texte et la sélection, et reçoit le nouveau texte.

export type FormatKind = "bold" | "italic" | "mark" | "color" | "clear";

export interface FormatResult {
  text: string;
  /** Nouvelle sélection (le passage mis en forme). */
  start: number;
  end: number;
}

/** Couleurs proposées pour le texte (lisibles sur fond sombre comme sur fond blanc). */
export const TEXT_COLORS: readonly { color: string; label: string }[] = [
  { color: "#d4a017", label: "Or" },
  { color: "#e5484d", label: "Rouge" },
  { color: "#f08a24", label: "Orange" },
  { color: "#2fa56b", label: "Vert" },
  { color: "#3b8eea", label: "Bleu" },
  { color: "#8e6bd9", label: "Violet" },
  { color: "#8a95a5", label: "Gris" },
];

const COLOR_OPEN = /\{\{#[0-9a-fA-F]{6}\|$/;
const COLOR_WRAP = /^\{\{#[0-9a-fA-F]{6}\|([\s\S]*)\}\}$/;

function leadingStars(text: string): number {
  return text.match(/^\*+/)?.[0].length ?? 0;
}

function trailingStars(text: string): number {
  return text.match(/\*+$/)?.[0].length ?? 0;
}

/** Combien de `*` forment un gras (2+) ou un italique (nombre impair) autour d'un passage, pour une série de `n` étoiles de chaque côté. */
function boldPresent(n: number): boolean {
  return n >= 2;
}
function italicPresent(n: number): boolean {
  return n % 2 === 1;
}

function openOf(kind: Exclude<FormatKind, "clear">, color?: string): string {
  return kind === "bold" ? "**" : kind === "italic" ? "*" : kind === "mark" ? "==" : `{{${color}|`;
}

function closeOf(kind: Exclude<FormatKind, "clear">): string {
  return kind === "bold" ? "**" : kind === "italic" ? "*" : kind === "mark" ? "==" : "}}";
}

/** Retire de `piece` les marques qui l'entourent exactement (ou null s'il n'y en a pas pour ce format). */
function unwrapInside(piece: string, kind: Exclude<FormatKind, "clear">): string | null {
  if (kind === "bold" || kind === "italic") {
    const n = Math.min(leadingStars(piece), trailingStars(piece));
    if (piece.length <= n * 2) return null;
    if (kind === "bold" && boldPresent(n)) return piece.slice(2, -2);
    if (kind === "italic" && italicPresent(n)) return piece.slice(1, -1);
    return null;
  }
  if (kind === "mark") return piece.length > 4 && piece.startsWith("==") && piece.endsWith("==") ? piece.slice(2, -2) : null;
  const match = piece.match(COLOR_WRAP);
  return match ? match[1] : null;
}

/** Rend `piece` mis en forme (ou « défait » s'il l'était déjà). */
function applyToPiece(piece: string, kind: Exclude<FormatKind, "clear">, color?: string): string {
  if (kind === "color") {
    const existing = piece.match(COLOR_WRAP);
    if (existing) {
      const same = piece.startsWith(`{{${color}|`);
      return same ? existing[1] : `{{${color}|${existing[1]}}}`;
    }
  }
  const inner = unwrapInside(piece, kind);
  if (inner !== null) return inner;
  return `${openOf(kind, color)}${piece}${closeOf(kind)}`;
}

/** Retire toute mise en forme d'un passage (marques imbriquées comprises). */
function stripFormatting(piece: string): string {
  let current = piece;
  for (let pass = 0; pass < 6; pass++) {
    const next = current
      .replace(/\{\{#[0-9a-fA-F]{6}\|(.*?)\}\}/g, "$1")
      .replace(/==(.+?)==/g, "$1")
      .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1");
    if (next === current) break;
    current = next;
  }
  return current;
}

/**
 * Met en forme le passage [start, end) de `text`. Sur un passage déjà mis en forme (ou dont les marques sont
 * juste autour), la même commande l'enlève. Les espaces en bord de sélection restent en dehors des marques.
 * Renvoie null s'il n'y a rien de sélectionné.
 */
export function formatSelection(text: string, start: number, end: number, kind: FormatKind, color?: string): FormatResult | null {
  let from = Math.max(0, Math.min(start, end));
  let to = Math.min(text.length, Math.max(start, end));
  // Les espaces en bord de sélection restent en dehors des marques (« ** mot** » ne s'affiche pas en gras).
  while (from < to && /\s/.test(text[from])) from++;
  while (to > from && /\s/.test(text[to - 1])) to--;
  if (from >= to) return null;
  if (kind === "color" && !(color && /^#[0-9a-fA-F]{6}$/.test(color))) return null;

  const selected = text.slice(from, to);
  const colorKind = kind as Exclude<FormatKind, "clear">;

  if (kind === "clear") {
    const around = text.slice(0, from).match(COLOR_OPEN);
    let before = text.slice(0, from);
    let after = text.slice(to);
    let piece = stripFormatting(selected);
    // Marques juste autour du passage : on les retire aussi.
    if (around && after.startsWith("}}")) {
      before = before.slice(0, -around[0].length);
      after = after.slice(2);
    }
    for (const mark of ["==", "***", "**", "*"]) {
      if (before.endsWith(mark) && after.startsWith(mark) && !(mark === "*" && (before.endsWith("**") || after.startsWith("**")))) {
        before = before.slice(0, -mark.length);
        after = after.slice(mark.length);
      }
    }
    piece = piece.length ? piece : selected;
    return { text: `${before}${piece}${after}`, start: before.length, end: before.length + piece.length };
  }

  // Plusieurs lignes : chaque ligne reçoit ses propres marques (elles ne traversent jamais un retour à la ligne).
  if (selected.includes("\n")) {
    const lines = selected.split("\n").map((line) => {
      const lead = line.length - line.trimStart().length;
      const body = line.trim();
      return body ? `${line.slice(0, lead)}${applyToPiece(body, colorKind, color)}` : line;
    });
    const replaced = lines.join("\n");
    return { text: `${text.slice(0, from)}${replaced}${text.slice(to)}`, start: from, end: from + replaced.length };
  }

  // Une seule ligne : marques déjà juste autour du passage → on les enlève.
  const before = text.slice(0, from);
  const after = text.slice(to);
  if (kind === "bold" || kind === "italic") {
    const n = Math.min(trailingStars(before), leadingStars(after));
    const present = kind === "bold" ? boldPresent(n) : italicPresent(n);
    if (present) {
      const size = kind === "bold" ? 2 : 1;
      return { text: `${before.slice(0, -size)}${selected}${after.slice(size)}`, start: from - size, end: to - size };
    }
  } else if (kind === "mark") {
    if (before.endsWith("==") && after.startsWith("==")) {
      return { text: `${before.slice(0, -2)}${selected}${after.slice(2)}`, start: from - 2, end: to - 2 };
    }
  } else {
    const open = before.match(COLOR_OPEN);
    if (open && after.startsWith("}}")) {
      const same = open[0] === `{{${color}|`;
      const head = before.slice(0, -open[0].length);
      const middle = same ? selected : `{{${color}|${selected}}}`;
      const next = `${head}${middle}${after.slice(2)}`;
      const innerStart = head.length + (same ? 0 : `{{${color}|`.length);
      return { text: next, start: innerStart, end: innerStart + selected.length };
    }
  }

  const wrapped = applyToPiece(selected, colorKind, color);
  const result = `${before}${wrapped}${after}`;
  // Sélection = le texte lui-même (sans les marques) pour pouvoir enchaîner une autre mise en forme ;
  // si les marques ont été retirées ou la couleur changée, tout le passage reste sélectionné.
  const index = wrapped.indexOf(selected);
  const innerStart = from + Math.max(0, index);
  return index >= 0
    ? { text: result, start: innerStart, end: innerStart + selected.length }
    : { text: result, start: from, end: from + wrapped.length };
}
