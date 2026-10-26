// Aperçu miniature d'un graphe (vignette de la page Graph) : les fiches comme des cartes, les relations comme des
// traits, à la position où elles sont posées. Calculé à partir des données (rien à stocker, toujours à jour).
import { clampImageWidth } from "./shapes";
import type { InvestigationEntity, Relation } from "./types";

/** Taille supposée d'une carte de fiche sur le graphe (mesurée côté écran ; ici seulement pour la miniature). */
const CARD_WIDTH = 340;
const CARD_HEIGHT = 120;
const IMAGE_CARD_RATIO = 0.75;
/** Au-delà, la miniature ne gagne rien en lisibilité : on dessine les premières fiches seulement. */
export const MAX_PREVIEW_ENTITIES = 150;
const DEFAULT_COLOR = "#e0b44c";
const COLOR = /^#[0-9a-fA-F]{6}$/;

export interface PreviewNode {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  image: boolean;
}

export interface PreviewEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dashed: boolean;
  color: string;
}

export interface GraphPreview {
  /** Cadre du dessin, en unités du graphe, avec une petite marge. */
  viewBox: { x: number; y: number; width: number; height: number };
  nodes: PreviewNode[];
  edges: PreviewEdge[];
}

function colorOf(value: string | undefined): string {
  return value && COLOR.test(value) ? value : DEFAULT_COLOR;
}

/** Miniature d'un graphe, ou null s'il n'y a aucune fiche à dessiner. */
export function graphPreview(entities: readonly InvestigationEntity[], relations: readonly Relation[]): GraphPreview | null {
  const drawn = entities.filter((e) => Number.isFinite(e.position?.x) && Number.isFinite(e.position?.y)).slice(0, MAX_PREVIEW_ENTITIES);
  if (drawn.length === 0) return null;

  const nodes = new Map<string, PreviewNode>();
  for (const entity of drawn) {
    const image = entity.type === "image";
    const width = image ? clampImageWidth(entity.imageWidth) : CARD_WIDTH;
    nodes.set(entity.id, {
      x: entity.position.x,
      y: entity.position.y,
      width,
      height: image ? Math.round(width * IMAGE_CARD_RATIO) : CARD_HEIGHT,
      color: colorOf(entity.borderColor),
      image,
    });
  }

  const edges: PreviewEdge[] = [];
  for (const relation of relations) {
    const from = nodes.get(relation.sourceEntityId);
    const to = nodes.get(relation.targetEntityId);
    if (!from || !to || from === to) continue;
    edges.push({
      x1: from.x + from.width / 2,
      y1: from.y + from.height / 2,
      x2: to.x + to.width / 2,
      y2: to.y + to.height / 2,
      dashed: relation.status === "hypothesis",
      color: colorOf(relation.lineColor),
    });
  }

  const list = [...nodes.values()];
  const left = Math.min(...list.map((n) => n.x));
  const top = Math.min(...list.map((n) => n.y));
  const right = Math.max(...list.map((n) => n.x + n.width));
  const bottom = Math.max(...list.map((n) => n.y + n.height));
  const margin = Math.max(right - left, bottom - top) * 0.05 + 20;
  return {
    viewBox: { x: left - margin, y: top - margin, width: right - left + margin * 2, height: bottom - top + margin * 2 },
    nodes: list,
    edges,
  };
}
