"use client";

import { GridStack as GridStackGrid } from "gridstack";
import { GridStack, useGridStack, type GridStackNode, type GridStackOptions, type GridStackWidget } from "gridstack/dist/react";
import "gridstack/dist/gridstack.css";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { defaultSizeFor, minSizeFor, samePlacements, type Placement } from "@/lib/supervision/lab/layout";
import { MODULES } from "@/lib/supervision/lab/modules";
import { GAP, ROW_HEIGHT, type GridEngineProps } from "./types";

const NEW_PREFIX = "new:";

// GridStack crée lui-même les cases dans le DOM et y rend nos composants par portail (wrapper officiel `gridstack/dist/react`).
// Le contenu d'une case est donc rendu par ce composant, qui lit la fonction de rendu dans un contexte (les « props » d'un
// widget GridStack sont sérialisées en JSON : on n'y met que l'identifiant).
const RenderContext = createContext<(id: string) => ReactNode>(() => null);

function LabWidget({ id }: { id?: string }) {
  const render = useContext(RenderContext);
  if (!id || id.startsWith(NEW_PREFIX)) return null;
  return <>{render(id)}</>;
}

function toWidget(p: Placement, kinds: Record<string, GridEngineProps["kinds"][string]>, cols: number): GridStackWidget {
  const min = minSizeFor(kinds[p.id], cols);
  return { id: p.id, x: p.x, y: p.y, w: p.w, h: p.h, minW: min.w, minH: min.h, component: "LabWidget", props: { id: p.id } };
}

function nodesToPlacements(nodes: readonly GridStackNode[]): Placement[] {
  return nodes
    .filter((n) => typeof n.id === "string" && !n.id.startsWith(NEW_PREFIX))
    .map((n) => ({ id: String(n.id), x: n.x ?? 0, y: n.y ?? 0, w: n.w ?? 1, h: n.h ?? 1 }));
}

interface SyncProps {
  cols: number;
  placements: Placement[];
  kinds: GridEngineProps["kinds"];
  editable: boolean;
  onPlacementsChange: GridEngineProps["onPlacementsChange"];
  onLibraryDrop: GridEngineProps["onLibraryDrop"];
  register: (handlers: { dropped: (node: GridStackNode) => void; changed: () => void }) => void;
}

/** Garde la grille GridStack alignée sur notre état (l'état est la référence) et active la dépose depuis la bibliothèque. */
function Sync({ cols, placements, kinds, editable, onPlacementsChange, onLibraryDrop, register }: SyncProps) {
  const { grid, addWidget, layoutVersion } = useGridStack();

  // Cases ajoutées, supprimées ou déplacées par notre état (ajout au clic, duplication, suppression, réinitialisation).
  useEffect(() => {
    if (!grid) return;
    const nodes = grid.engine.nodes.filter((n) => typeof n.id === "string" && !String(n.id).startsWith(NEW_PREFIX));
    const wanted = new Set(placements.map((p) => p.id));
    for (const node of nodes) if (!wanted.has(String(node.id)) && node.el) grid.removeWidget(node.el, true, false);
    const present = new Set(nodes.map((n) => String(n.id)));
    for (const p of placements) if (!present.has(p.id)) addWidget(toWidget(p, kinds, cols));
    const current = nodesToPlacements(grid.engine.nodes);
    if (!samePlacements(current, placements)) {
      grid.batchUpdate();
      for (const p of placements) {
        const el = grid.engine.nodes.find((n) => n.id === p.id)?.el;
        if (el) grid.update(el, { x: p.x, y: p.y, w: p.w, h: p.h });
      }
      grid.batchUpdate(false);
    }
  }, [grid, placements, kinds, cols, addWidget, layoutVersion]);

  useEffect(() => {
    grid?.setStatic(!editable);
  }, [grid, editable]);

  // Dépose depuis la bibliothèque : GridStack crée une case provisoire « new:<module> » ; on la retire et on laisse notre état créer le vrai module.
  // Gestes de l'utilisateur seulement (fin de glissement ou de redimensionnement) : on relit toute la grille et on prévient notre état.
  // Surtout pas l'événement « change », qui part aussi quand NOUS modifions la grille : état et grille se renverraient la balle.
  useEffect(() => {
    register({
      dropped: (node) => {
        const kind = String(node.id).slice(NEW_PREFIX.length);
        if (node.el && grid) grid.removeWidget(node.el, true, false);
        const known = MODULES.find((m) => m.kind === kind);
        if (known) onLibraryDrop(known.kind, node.x ?? 0, node.y ?? 0);
      },
      changed: () => {
        if (!grid) return;
        const next = nodesToPlacements(grid.engine.nodes);
        if (next.length === placements.length && !samePlacements(next, placements)) onPlacementsChange(next);
      },
    });
  }, [grid, register, onLibraryDrop, placements, onPlacementsChange]);

  useEffect(() => {
    if (!grid || !editable) return;
    const defs: GridStackWidget[] = MODULES.map((m) => {
      const size = defaultSizeFor(m.kind, cols);
      return { w: size.w, h: size.h, id: `${NEW_PREFIX}${m.kind}`, component: "LabWidget", props: { id: `${NEW_PREFIX}${m.kind}` } };
    });
    GridStackGrid.setupDragIn("[data-lab-chip]", { appendTo: "body", helper: "clone" }, defs);
  }, [grid, editable, cols]);

  return null;
}

/** Adaptateur GridStack 14 (wrapper React officiel, mode « composant »). La grille est recréée à chaque changement de largeur (12/6/1 colonnes). */
export default function GridStackEngine({ breakpoint, cols, placements, kinds, editable, onPlacementsChange, onLibraryDrop, renderWidget }: GridEngineProps) {
  // Options figées à la création : les changements ultérieurs passent par l'API de la grille (voir Sync), pas par de nouvelles options.
  const [initial] = useState(() => ({ placements, kinds, cols, editable }));
  const options = useMemo<GridStackOptions>(
    () => ({
      column: cols,
      cellHeight: ROW_HEIGHT,
      margin: GAP / 2,
      float: false,
      animate: true,
      staticGrid: !initial.editable,
      // Par défaut GridStack n'accepte que les éléments de classe « .grid-stack-item » : on lui désigne nos puces de bibliothèque.
      acceptWidgets: (el: Element) => el.hasAttribute("data-lab-chip"),
      // Pas de bascule automatique en une colonne : le passage 12 → 6 → 1 colonnes est géré par nous (dispositions distinctes).
      columnOpts: { columnMax: cols, breakpoints: [] },
      draggable: { handle: "[data-lab-handle]" },
      resizable: { handles: "se" },
      children: initial.placements.map((p) => toWidget(p, initial.kinds, initial.cols)),
    }),
    [cols, initial],
  );
  const handlersRef = useRef<{ dropped: (node: GridStackNode) => void; changed: () => void }>({ dropped: () => {}, changed: () => {} });
  const register = useCallback((handlers: { dropped: (node: GridStackNode) => void; changed: () => void }) => {
    handlersRef.current = handlers;
  }, []);
  const components = useMemo(() => ({ LabWidget: LabWidget as never }), []);

  return (
    <RenderContext.Provider value={renderWidget}>
      <GridStack
        key={breakpoint}
        options={options}
        components={components}
        onDropped={(_event, _previous, node) => handlersRef.current.dropped(node)}
        onDragStop={() => handlersRef.current.changed()}
        onResizeStop={() => handlersRef.current.changed()}
      >
        <Sync cols={cols} placements={placements} kinds={kinds} editable={editable} onPlacementsChange={onPlacementsChange} onLibraryDrop={onLibraryDrop} register={register} />
      </GridStack>
    </RenderContext.Provider>
  );
}
