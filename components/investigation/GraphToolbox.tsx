"use client";

import {
  FONT_SIZES,
  PALETTE,
  SHAPE_KINDS,
  SHAPE_LABELS,
  STROKE_WIDTHS,
  hasFill,
  type LayerOperation,
} from "@/lib/investigation/shapes";
import type { GraphShape, ShapeKind } from "@/lib/investigation/types";
import CustomColorInput from "./CustomColorInput";
import styles from "./GraphToolbox.module.css";

export type ColorTarget = "fill" | "stroke" | "text";

interface GraphToolboxProps {
  selected: GraphShape | null;
  onAdd: (kind: ShapeKind) => void;
  onChange: (patch: Partial<GraphShape>) => void;
  onLayer: (operation: LayerOperation) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  /** Mode « copier la couleur d'une forme » (repli quand la pipette du navigateur n'existe pas). */
  pipetteTarget: ColorTarget | null;
  onPipetteTarget: (target: ColorTarget | null) => void;
}

type EyeDropperConstructor = new () => { open: () => Promise<{ sRGBHex: string }> };

function eyeDropper(): EyeDropperConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { EyeDropper?: EyeDropperConstructor }).EyeDropper;
}

function ShapeIcon({ kind }: { kind: ShapeKind }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "rect":
      return (
        <svg {...common} aria-hidden="true">
          <rect x="3.5" y="6" width="17" height="12" />
        </svg>
      );
    case "roundRect":
      return (
        <svg {...common} aria-hidden="true">
          <rect x="3.5" y="6" width="17" height="12" rx="4" />
        </svg>
      );
    case "ellipse":
      return (
        <svg {...common} aria-hidden="true">
          <ellipse cx="12" cy="12" rx="9" ry="6.5" />
        </svg>
      );
    case "triangle":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 4.5 20.5 19h-17z" />
        </svg>
      );
    case "diamond":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 3.5 20.5 12 12 20.5 3.5 12z" />
        </svg>
      );
    case "line":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 19 20 5" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 19 19 5M10 5h9v9" />
        </svg>
      );
    case "text":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M5 6.5V5h14v1.5M12 5v14M9 19h6" />
        </svg>
      );
  }
}

function PipetteIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m14 6 4 4M4 20l1-4 9-9a2.1 2.1 0 0 1 3 0l1 1a2.1 2.1 0 0 1 0 3l-9 9z" />
    </svg>
  );
}

function ColorRow({
  label,
  value,
  allowNone,
  target,
  pipetteTarget,
  onPipetteTarget,
  onChange,
}: {
  label: string;
  value: string | undefined;
  allowNone: boolean;
  target: ColorTarget;
  pipetteTarget: ColorTarget | null;
  onPipetteTarget: (target: ColorTarget | null) => void;
  onChange: (color: string | undefined) => void;
}) {
  const active = pipetteTarget === target;

  async function pickWithEyeDropper() {
    const Dropper = eyeDropper();
    if (!Dropper) {
      // Pas de pipette dans ce navigateur : un clic sur une autre forme du graphe copie sa couleur.
      onPipetteTarget(active ? null : target);
      return;
    }
    try {
      const result = await new Dropper().open();
      onChange(result.sRGBHex);
    } catch {
      // annulé (Échap)
    }
  }

  return (
    <div className={styles.colorRow}>
      <div className={styles.rowHead}>
        <span className={styles.rowLabel}>{label}</span>
        <button
          type="button"
          className={active ? `${styles.pipette} ${styles.pipetteOn}` : styles.pipette}
          title={
            eyeDropper()
              ? "Pipette : copier une couleur n'importe où sur l'écran"
              : active
                ? "Clique sur une forme du graphe pour copier sa couleur (re-clique ici pour annuler)"
                : "Pipette : cliquer ici, puis sur une forme du graphe pour copier sa couleur"
          }
          aria-pressed={active}
          onClick={() => void pickWithEyeDropper()}
        >
          <PipetteIcon />
        </button>
      </div>
      <div className={styles.swatches}>
        {allowNone ? (
          <button
            type="button"
            className={value === undefined ? `${styles.swatch} ${styles.swatchNone} ${styles.swatchOn}` : `${styles.swatch} ${styles.swatchNone}`}
            title="Aucun"
            aria-label={`${label} : aucun`}
            aria-pressed={value === undefined}
            onClick={() => onChange(undefined)}
          />
        ) : null}
        {PALETTE.map((entry) => (
          <button
            key={entry.color}
            type="button"
            className={value?.toLowerCase() === entry.color ? `${styles.swatch} ${styles.swatchOn}` : styles.swatch}
            style={{ background: entry.color }}
            title={entry.label}
            aria-label={`${label} : ${entry.label}`}
            aria-pressed={value?.toLowerCase() === entry.color}
            onClick={() => onChange(entry.color)}
          />
        ))}
        <label className={styles.custom} title="Autre couleur">
          <CustomColorInput value={value} onCommit={onChange} label={`${label} : couleur personnalisée`} />
        </label>
      </div>
      {active ? <span className={styles.hint}>Clique sur une forme du graphe pour copier sa couleur.</span> : null}
    </div>
  );
}

// Boîte à outils du graphe : ajouter des formes et des annotations, régler leurs couleurs, leur
// texte et leur ordre (premier plan / dernier plan).
export default function GraphToolbox({
  selected,
  onAdd,
  onChange,
  onLayer,
  onDuplicate,
  onDelete,
  pipetteTarget,
  onPipetteTarget,
}: GraphToolboxProps) {
  const isLine = selected?.kind === "line" || selected?.kind === "arrow";
  const locked = selected?.locked === true;

  return (
    <div className={styles.toolbox} onMouseDown={(event) => event.stopPropagation()}>
      <span className={styles.title}>Ajouter</span>
      <div className={styles.kinds}>
        {SHAPE_KINDS.map((kind) => (
          <button key={kind} type="button" className={styles.kind} title={SHAPE_LABELS[kind]} aria-label={`Ajouter : ${SHAPE_LABELS[kind]}`} onClick={() => onAdd(kind)}>
            <ShapeIcon kind={kind} />
          </button>
        ))}
      </div>

      {selected ? (
        <>
          <span className={styles.title}>{SHAPE_LABELS[selected.kind]}</span>

          <div className={styles.actionsTop}>
            <button type="button" className={styles.action} onClick={() => onChange({ locked: !locked })}>
              {locked ? "🔒 Rouvrir" : "🔓 Verrouiller"}
            </button>
            <button type="button" className={styles.action} onClick={onDuplicate}>
              Dupliquer
            </button>
            <button
              type="button"
              className={`${styles.action} ${styles.danger}`}
              onClick={onDelete}
              disabled={locked}
              title="Supprimer la forme (touche Suppr)"
            >
              Supprimer
            </button>
          </div>

          {locked ? <p className={styles.note}>Forme verrouillée : rouvre le cadenas pour la modifier ou la supprimer.</p> : null}

          <fieldset className={styles.group} disabled={locked}>
            {hasFill(selected.kind) ? (
              <>
                <ColorRow
                  label="Remplissage"
                  value={selected.fill}
                  allowNone
                  target="fill"
                  pipetteTarget={pipetteTarget}
                  onPipetteTarget={onPipetteTarget}
                  onChange={(color) => onChange({ fill: color })}
                />
                {selected.fill ? (
                  <label className={styles.slider}>
                    <span>Opacité {Math.round((selected.fillOpacity ?? 1) * 100)} %</span>
                    <input type="range" min={5} max={100} value={Math.round((selected.fillOpacity ?? 1) * 100)} onChange={(event) => onChange({ fillOpacity: Number(event.target.value) / 100 })} />
                  </label>
                ) : null}
              </>
            ) : null}

            <ColorRow
              label={isLine ? "Couleur du trait" : "Contour"}
              value={selected.stroke}
              allowNone={!isLine}
              target="stroke"
              pipetteTarget={pipetteTarget}
              onPipetteTarget={onPipetteTarget}
              onChange={(color) => onChange({ stroke: color })}
            />
            {selected.stroke ? (
              <label className={styles.inline}>
                <span>Épaisseur</span>
                <select value={selected.strokeWidth ?? 2} onChange={(event) => onChange({ strokeWidth: Number(event.target.value) })}>
                  {STROKE_WIDTHS.map((width) => (
                    <option key={width} value={width}>
                      {width} px
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {isLine ? (
              <button type="button" className={styles.action} onClick={() => onChange({ flipped: !selected.flipped })} title="Utile quand la ligne est en diagonale">
                ⇅ Changer de diagonale
              </button>
            ) : (
              <>
                <label className={styles.textArea}>
                  <span className={styles.rowLabel}>Texte</span>
                  <textarea value={selected.text ?? ""} rows={3} placeholder="Annotation…" onChange={(event) => onChange({ text: event.target.value })} />
                </label>
                <label className={styles.inline}>
                  <span>Taille</span>
                  <select value={selected.fontSize ?? 14} onChange={(event) => onChange({ fontSize: Number(event.target.value) })}>
                    {FONT_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size} px
                      </option>
                    ))}
                  </select>
                </label>
                <ColorRow
                  label="Couleur du texte"
                  value={selected.textColor ?? "#ffffff"}
                  allowNone={false}
                  target="text"
                  pipetteTarget={pipetteTarget}
                  onPipetteTarget={onPipetteTarget}
                  onChange={(color) => onChange({ textColor: color })}
                />
              </>
            )}
          </fieldset>

          <span className={styles.title}>Couche</span>
          <div className={styles.layers}>
            <button type="button" className={styles.action} onClick={() => onLayer("front")} title="Devant tout le reste">
              Premier plan
            </button>
            <button type="button" className={styles.action} onClick={() => onLayer("forward")} title="Avancer d'un cran">
              Avancer
            </button>
            <button type="button" className={styles.action} onClick={() => onLayer("backward")} title="Reculer d'un cran">
              Reculer
            </button>
            <button type="button" className={styles.action} onClick={() => onLayer("back")} title="Derrière tout, y compris les fiches">
              Dernier plan
            </button>
          </div>

        </>
      ) : (
        <p className={styles.note}>Ajoute une forme, ou clique sur une forme du graphe pour la modifier.</p>
      )}
    </div>
  );
}
