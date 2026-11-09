"use client";

import ReactGridLayout, { type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useMemo } from "react";
import { defaultSizeFor, minSizeFor, samePlacements, type Placement } from "@/lib/supervision/dashboard/layout";
import { GAP, ROW_HEIGHT, type GridEngineProps } from "./types";

const DROPPING_ID = "__dropping-elem__";

/** Adaptateur React Grid Layout v2 : une grille contrôlée par notre état, chaque module est un enfant `<div key=id>`. */
export default function RglEngine({ cols, width, placements, kinds, editable, onPlacementsChange, onLibraryDrop, libraryDragRef, renderWidget }: GridEngineProps) {
  const layout: Layout = useMemo(
    () =>
      placements.map((p) => {
        const min = minSizeFor(kinds[p.id], cols);
        return { i: p.id, x: p.x, y: p.y, w: p.w, h: p.h, minW: min.w, minH: min.h };
      }),
    [placements, kinds, cols],
  );

  const fromLayout = (next: Layout): Placement[] => next.filter((item) => item.i !== DROPPING_ID).map((item) => ({ id: item.i, x: item.x, y: item.y, w: item.w, h: item.h }));

  return (
    <ReactGridLayout
      width={width}
      layout={layout}
      gridConfig={{ cols, rowHeight: ROW_HEIGHT, margin: [GAP, GAP], containerPadding: [0, 0] }}
      dragConfig={{ enabled: editable, handle: "[data-lab-handle]", cancel: "button, input, textarea, select" }}
      resizeConfig={{ enabled: editable }}
      dropConfig={{
        enabled: editable,
        defaultItem: { w: 4, h: 4 },
        onDragOver: () => {
          const kind = libraryDragRef.current;
          return kind ? defaultSizeFor(kind, cols) : false;
        },
      }}
      onLayoutChange={(next) => {
        const incoming = fromLayout(next);
        if (incoming.length === placements.length && !samePlacements(incoming, placements)) onPlacementsChange(incoming);
      }}
      onDrop={(_layout, item) => {
        const kind = libraryDragRef.current;
        libraryDragRef.current = null;
        if (kind && item) onLibraryDrop(kind, item.x, item.y);
      }}
    >
      {placements.map((p) => (
        <div key={p.id}>{renderWidget(p.id)}</div>
      ))}
    </ReactGridLayout>
  );
}
