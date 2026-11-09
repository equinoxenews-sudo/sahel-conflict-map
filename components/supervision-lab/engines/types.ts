import type { MutableRefObject, ReactNode } from "react";
import type { Breakpoint, Placement } from "@/lib/supervision/lab/layout";
import type { ModuleKind } from "@/lib/supervision/lab/modules";

/** Hauteur d'une ligne de la grille et espace entre modules, en pixels : identiques pour les deux moteurs. */
export const ROW_HEIGHT = 64;
export const GAP = 12;

/**
 * Ce qu'un moteur de grille doit savoir faire. L'adaptateur de React Grid Layout (le seul, GridStack ayant été écarté le 09/11/2026) implémente
 * cette interface : la disposition, les filtres et les modules sont à nous, le moteur n'affiche que des cases et nous
 * renvoie leurs positions. C'est ce qui rend la comparaison équitable et le choix final réversible.
 */
export interface GridEngineProps {
  breakpoint: Breakpoint;
  cols: number;
  /** Largeur de la grille en pixels (mesurée par le cadre). */
  width: number;
  placements: Placement[];
  kinds: Record<string, ModuleKind>;
  /** Mode Édition (déplacer, redimensionner) ou Consultation (verrouillé). */
  editable: boolean;
  /** Positions après un déplacement ou un redimensionnement fait à la main. */
  onPlacementsChange: (next: Placement[]) => void;
  /** Un module de la bibliothèque a été déposé sur la grille à cette case. */
  onLibraryDrop: (kind: ModuleKind, x: number, y: number) => void;
  /** Module en cours de glisser depuis la bibliothèque (lu par les moteurs dont l'API ne transmet pas les données glissées). */
  libraryDragRef: MutableRefObject<ModuleKind | null>;
  renderWidget: (id: string) => ReactNode;
}
