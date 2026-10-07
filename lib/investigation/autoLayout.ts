import { Graph, layout } from "@dagrejs/dagre";

// Mise en page automatique du graphe en arbre. Les relations hiérarchiques
// (filiale, dirige, chef de…) donnent les niveaux ; les relations latérales
// (travaille avec…) placent la fiche à côté de sa voisine ; les fiches sans aucun
// lien sont rangées en grille. Les fiches épinglées ne bougent pas.

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pinned?: boolean;
}

export interface HierarchyLink {
  parent: string;
  child: string;
}

export interface LateralLink {
  a: string;
  b: string;
}

export interface LayoutOptions {
  /** TB : haut vers bas ; LR : gauche vers droite. */
  direction: "TB" | "LR";
  gapX?: number;
  gapY?: number;
}

export type Positions = Record<string, { x: number; y: number }>;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const overlaps = (a: Box, b: Box, gap: number) =>
  a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;

export function computeTreeLayout(
  nodes: LayoutNode[],
  hierarchy: HierarchyLink[],
  lateral: LateralLink[],
  options: LayoutOptions
): Positions {
  const gapX = options.gapX ?? 60;
  const gapY = options.gapY ?? 70;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const links = hierarchy.filter((link) => byId.has(link.parent) && byId.has(link.child) && link.parent !== link.child);

  // 1. Arbre des fiches reliées par une hiérarchie.
  const inTree = new Set(links.flatMap((link) => [link.parent, link.child]));
  const placed = new Map<string, Box>();
  if (links.length > 0) {
    const graph = new Graph();
    graph.setGraph({ rankdir: options.direction, nodesep: gapX, ranksep: gapY, marginx: 0, marginy: 0 });
    graph.setDefaultEdgeLabel(() => ({}));
    for (const id of inTree) {
      const node = byId.get(id)!;
      graph.setNode(id, { width: node.width, height: node.height });
    }
    for (const link of links) graph.setEdge(link.parent, link.child);
    layout(graph);
    for (const id of inTree) {
      const laid = graph.node(id);
      placed.set(id, { x: laid.x - laid.width / 2, y: laid.y - laid.height / 2, width: laid.width, height: laid.height });
    }
  }

  // 2. Fiches reliées seulement latéralement : à côté de leur voisine déjà placée.
  const queue = nodes.filter((node) => !placed.has(node.id));
  let progressed = true;
  while (progressed && queue.length > 0) {
    progressed = false;
    for (let i = queue.length - 1; i >= 0; i--) {
      const node = queue[i];
      const neighbourId = lateral.find((link) => (link.a === node.id && placed.has(link.b)) || (link.b === node.id && placed.has(link.a)));
      if (!neighbourId) continue;
      const anchor = placed.get(neighbourId.a === node.id ? neighbourId.b : neighbourId.a)!;
      const box: Box = { x: anchor.x + anchor.width + gapX, y: anchor.y, width: node.width, height: node.height };
      // Décalage tant que la place est prise (vers la droite, ou vers le bas en mode horizontal).
      for (let guard = 0; guard < 200 && [...placed.values()].some((other) => overlaps(box, other, gapX / 2)); guard++) {
        if (options.direction === "TB") box.x += node.width + gapX;
        else box.y += node.height + gapY;
      }
      placed.set(node.id, box);
      queue.splice(i, 1);
      progressed = true;
    }
  }

  // 3. Fiches isolées : une grille sous (ou à droite de) l'ensemble.
  const boxes = [...placed.values()];
  const bottom = boxes.length ? Math.max(...boxes.map((b) => b.y + b.height)) : 0;
  const right = boxes.length ? Math.max(...boxes.map((b) => b.x + b.width)) : 0;
  const left = boxes.length ? Math.min(...boxes.map((b) => b.x)) : 0;
  const top = boxes.length ? Math.min(...boxes.map((b) => b.y)) : 0;
  let cursorX = options.direction === "TB" ? left : right + gapX * 2;
  let cursorY = options.direction === "TB" ? bottom + gapY * 1.5 : top;
  let rowHeight = 0;
  const maxRowWidth = 1500;
  for (const node of queue) {
    if (options.direction === "TB") {
      if (cursorX > left && cursorX - left + node.width > maxRowWidth) {
        cursorX = left;
        cursorY += rowHeight + gapY;
        rowHeight = 0;
      }
      placed.set(node.id, { x: cursorX, y: cursorY, width: node.width, height: node.height });
      cursorX += node.width + gapX;
      rowHeight = Math.max(rowHeight, node.height);
    } else {
      placed.set(node.id, { x: cursorX, y: cursorY, width: node.width, height: node.height });
      cursorY += node.height + gapY;
    }
  }

  // 4. Le résultat garde l'angle haut-gauche de l'ensemble actuel : le graphe ne « saute » pas.
  const origin = {
    x: Math.min(...nodes.map((node) => node.x)),
    y: Math.min(...nodes.map((node) => node.y)),
  };
  const all = [...placed.values()];
  const shift = {
    x: origin.x - Math.min(...all.map((b) => b.x)),
    y: origin.y - Math.min(...all.map((b) => b.y)),
  };

  const positions: Positions = {};
  for (const node of nodes) {
    const box = placed.get(node.id);
    // Une fiche épinglée garde sa position exacte.
    positions[node.id] = node.pinned || !box ? { x: node.x, y: node.y } : { x: Math.round(box.x + shift.x), y: Math.round(box.y + shift.y) };
  }
  return positions;
}
